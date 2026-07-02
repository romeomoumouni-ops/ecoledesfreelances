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

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');

  const contactUnread = await getContactUnread(profile.id);

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
    >
      {children}
    </AppShell>
  );
}
