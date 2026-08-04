import { createClient } from '@/lib/supabase/server';
import CloserClient from './CloserClient';

export const dynamic = 'force-dynamic';

export type Achat = {
  email: string;
  plan: string;
  customer_name: string | null;
  customer_phone: string | null; // chiffres avec indicatif, ou 'aucun'
  last_paid_at: string; // dernier paiement (tri « le plus récent »)
  payments: number; // nb de paiements de ce client sur ce plan
};

export default async function CloserPage() {
  const supabase = createClient();

  // Toutes les ventes des 3 formules (paginé au-delà de 1000 lignes)
  const PAGE = 1000;
  type Row = {
    email: string;
    plan: string;
    customer_name: string | null;
    customer_phone: string | null;
    created_at: string;
  };
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from('chariow_purchases')
      .select('email, plan, customer_name, customer_phone, created_at')
      .in('plan', ['1x200', '1x', '3x', '6x'])
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE) break;
  }

  // Un client = une ligne par formule (on garde son paiement le plus récent,
  // et le premier nom/téléphone connus).
  const byKey = new Map<string, Achat>();
  for (const r of rows) {
    const key = `${r.plan}:${r.email}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        email: r.email,
        plan: r.plan,
        customer_name: r.customer_name,
        customer_phone: r.customer_phone,
        last_paid_at: r.created_at,
        payments: 1,
      });
    } else {
      existing.payments += 1;
      if (!existing.customer_name && r.customer_name) existing.customer_name = r.customer_name;
      if ((!existing.customer_phone || existing.customer_phone === 'aucun') && r.customer_phone)
        existing.customer_phone = r.customer_phone;
      if (r.created_at > existing.last_paid_at) existing.last_paid_at = r.created_at;
    }
  }

  // Combien de ventes restent sans numéro (pour le bouton Synchroniser)
  const { count: sansNumero } = await supabase
    .from('chariow_purchases')
    .select('sale_id', { count: 'exact', head: true })
    .in('plan', ['1x200', '1x', '3x', '6x'])
    .is('customer_phone', null);

  return <CloserClient achats={[...byKey.values()]} sansNumero={sansNumero ?? 0} />;
}
