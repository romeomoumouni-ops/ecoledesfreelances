import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/user';
import { redirect } from 'next/navigation';
import PaiementsClient from './PaiementsClient';

export const dynamic = 'force-dynamic';

export type ClientAcces = {
  email: string;
  plan: string;
  payments_count: number;
  total_payments: number;
  access_until: string | null;
  updated_at: string;
};

export type Revenue = {
  total: number;
  ventes: number;
  plans: Record<string, { ventes: number; montant: number }>;
};

export default async function AdminPaiementsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');
  // Réservé au super admin (le middleware redirige déjà ; double garde ici)
  if (!profile.is_super_admin) redirect('/admin');

  const supabase = createClient();

  // Chiffre d'affaires (RPC réservée au super admin, côté base également)
  const { data: revenue } = await supabase.rpc('super_admin_revenue');

  // Supabase limite chaque requête à 1000 lignes : on pagine pour tout ramener.
  const PAGE = 1000;
  const grants: ClientAcces[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from('access_grants')
      .select('email, plan, payments_count, total_payments, access_until, updated_at')
      .order('updated_at', { ascending: false })
      .range(from, from + PAGE - 1);
    grants.push(...((data ?? []) as ClientAcces[]));
    if (!data || data.length < PAGE) break;
  }

  return <PaiementsClient clients={grants} revenue={(revenue as Revenue) ?? null} />;
}
