import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { getCurrentProfile } from '@/lib/user';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Nombre de réponses de coachs non lues par l'élève. */
async function getContactUnread(userId: string): Promise<number> {
  const supabase = createClient();
  const [{ data: msgs }, { data: marks }] = await Promise.all([
    supabase
      .from('support_messages')
      .select('recipient, created_at')
      .eq('student_id', userId)
      .eq('from_admin', true),
    supabase.from('read_marks').select('scope, last_read_at').eq('user_id', userId),
  ]);
  const readAt = new Map(
    (marks ?? [])
      .filter((m) => m.scope.startsWith('contact:'))
      .map((m) => [m.scope.slice('contact:'.length), new Date(m.last_read_at).getTime()])
  );
  return (msgs ?? []).filter((m) => {
    const seen = readAt.get(m.recipient) ?? 0;
    return new Date(m.created_at).getTime() > seen;
  }).length;
}

/** Réponses non lues du chargé de suivi (fil suivi hebdomadaire). */
async function getSuiviUnread(userId: string): Promise<number> {
  const supabase = createClient();
  const [{ data: msgs }, { data: mark }] = await Promise.all([
    supabase.from('followup_messages').select('created_at').eq('student_id', userId).eq('from_admin', true),
    supabase.from('read_marks').select('last_read_at').eq('user_id', userId).eq('scope', 'suivi').maybeSingle(),
  ]);
  const seen = mark ? new Date(mark.last_read_at).getTime() : 0;
  return (msgs ?? []).filter((m) => new Date(m.created_at).getTime() > seen).length;
}

// Canaux regroupés sous l'onglet « Communauté » (le reste = « Témoignages »).
const COMMUNAUTE_CHANNELS = ['annonces', 'membres', 'victoires', 'challenge', 'ressources'];

/** Nombre de nouveaux posts non lus (hors les siens, hors signalés) sur un scope. */
async function getPostsUnread(userId: string, scope: string, channels: string[]): Promise<number> {
  const supabase = createClient();
  const { data: mark } = await supabase
    .from('read_marks')
    .select('last_read_at')
    .eq('user_id', userId)
    .eq('scope', scope)
    .maybeSingle();
  const since = mark?.last_read_at ?? '1970-01-01T00:00:00Z';
  const { count } = await supabase
    .from('community_posts')
    .select('id', { count: 'exact', head: true })
    .in('channel', channels)
    .eq('flagged', false)
    .neq('user_id', userId)
    .gt('created_at', since);
  return count ?? 0;
}

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');

  // Garde-fou paiement (secours — le middleware redirige déjà avant tout
  // rendu) : sans accès actif, direction la page de blocage /acces.
  // On récupère aussi le plan pour le bouton « Payer ma tranche » (3x/6x).
  let installment: { plan: string; paymentsCount: number; totalPayments: number } | null = null;
  if (!profile.is_admin) {
    const supabase = createClient();
    const { data: access } = await supabase.rpc('get_my_access');
    const a = access as {
      active?: boolean;
      plan?: string;
      payments_count?: number;
      total_payments?: number;
    } | null;
    if (a?.active !== true) {
      redirect('/acces');
    }
    // Membre en 3x/6x qui n'a pas fini de payer → bouton de règlement de tranche.
    if (
      (a.plan === '3x' || a.plan === '6x') &&
      typeof a.payments_count === 'number' &&
      typeof a.total_payments === 'number' &&
      a.payments_count < a.total_payments
    ) {
      installment = { plan: a.plan, paymentsCount: a.payments_count, totalPayments: a.total_payments };
    }
  }

  const supabaseNotif = createClient();
  const [
    contactUnread,
    suiviUnread,
    { data: annUnread },
    { data: persoUnread },
    communauteUnread,
    temoignagesUnread,
  ] = await Promise.all([
    getContactUnread(profile.id),
    getSuiviUnread(profile.id),
    supabaseNotif.rpc('my_unread_announcements'),
    supabaseNotif.rpc('my_unread_notifications'),
    getPostsUnread(profile.id, 'communaute', COMMUNAUTE_CHANNELS),
    getPostsUnread(profile.id, 'temoignages', ['temoignages']),
  ]);
  // Cloche = annonces de l'équipe + interactions personnelles (like/commentaire/réponse)
  const notifUnread = ((annUnread as number | null) ?? 0) + ((persoUnread as number | null) ?? 0);

  return (
    <AppShell
      profile={{
        id: profile.id,
        name: profile.full_name,
        handle: profile.handle,
        email: profile.email,
        avatarUrl: profile.avatar_url,
        isAdmin: profile.is_admin,
      }}
      contactUnread={contactUnread}
      suiviUnread={suiviUnread}
      notifUnread={notifUnread}
      communauteUnread={communauteUnread}
      temoignagesUnread={temoignagesUnread}
      installment={installment}
    >
      {children}
    </AppShell>
  );
}
