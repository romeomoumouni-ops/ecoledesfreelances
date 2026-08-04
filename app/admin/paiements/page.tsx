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
  on_platform: boolean; // a un compte (est réellement inscrit sur la plateforme)
};

export type Revenue = {
  total: number;
  ventes: number;
  plans: Record<string, { ventes: number; montant: number }>;
};

/** Un paiement de l'offre à 200 000 FCFA (une fois). */
export type Paiement200 = {
  sale_id: string;
  email: string;
  customer_name: string | null;
  customer_phone: string | null;
  amount: number | null;
  created_at: string;
  on_platform: boolean; // a créé son compte sur la plateforme
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

  // E-mails réellement inscrits (avec un compte) : le suivi des échéances ne
  // compte que ces étudiants-là (ceux qui sont vraiment sur la plateforme).
  const inscrits = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase.from('profiles').select('email').range(from, from + PAGE - 1);
    for (const p of data ?? []) if (p.email) inscrits.add((p.email as string).toLowerCase());
    if (!data || data.length < PAGE) break;
  }
  for (const g of grants) g.on_platform = inscrits.has(g.email.toLowerCase());

  // Offre à 200 000 FCFA (paiement en une fois) : chaque vente encaissée.
  const p200: Paiement200[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from('chariow_purchases')
      .select('sale_id, email, customer_name, customer_phone, amount, created_at')
      .eq('plan', '1x200')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    p200.push(...((data ?? []) as Paiement200[]));
    if (!data || data.length < PAGE) break;
  }
  for (const p of p200) p.on_platform = inscrits.has(p.email.toLowerCase());

  return <PaiementsClient clients={grants} revenue={(revenue as Revenue) ?? null} p200={p200} />;
}
