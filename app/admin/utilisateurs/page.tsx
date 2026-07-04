import { createClient } from '@/lib/supabase/server';
import UtilisateursClient from './UtilisateursClient';

export const dynamic = 'force-dynamic';

export type Membre = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  banned: boolean;
};

export type AccesDonne = {
  email: string;
  plan: string;
  payments_count: number;
  total_payments: number;
  access_until: string | null;
};

export type AccesManuel = {
  email: string;
  source: string | null;
  created_at: string;
};
// (types importés par UtilisateursClient)

export default async function AdminUsersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, is_admin, banned')
    .order('created_at', { ascending: true });

  // Accès donnés (achats Chariow) — pagine au-delà de la limite de 1000 lignes
  const PAGE = 1000;
  const acces: AccesDonne[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from('access_grants')
      .select('email, plan, payments_count, total_payments, access_until')
      .order('updated_at', { ascending: false })
      .range(from, from + PAGE - 1);
    acces.push(...((data ?? []) as AccesDonne[]));
    if (!data || data.length < PAGE) break;
  }

  // Accès donnés manuellement (hors paiement Chariow)
  const { data: manuels } = await supabase
    .from('allowed_emails')
    .select('email, source, created_at')
    .order('created_at', { ascending: false });

  return (
    <UtilisateursClient
      meId={user?.id ?? ''}
      membres={(profiles ?? []) as Membre[]}
      acces={acces}
      manuels={(manuels ?? []) as AccesManuel[]}
    />
  );
}
