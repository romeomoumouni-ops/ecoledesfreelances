import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Synchronisation « Closer » : récupère nom + téléphone WhatsApp des ventes
 * passées auprès de l'API Chariow (lot par lot). Réservé aux admins.
 * Chaque appel traite jusqu'à BATCH ventes sans téléphone ; le bouton de la
 * page relance tant qu'il en reste.
 */
const CHARIOW_API = 'https://api.chariow.com/v1';
const BATCH = 40;

function apiKeys(): string[] {
  return [process.env.CHARIOW_API_KEY, process.env.CHARIOW_API_KEY_2].filter(
    (k): k is string => !!k
  );
}

async function fetchSale(saleId: string): Promise<{ name: string | null; phone: string | null } | null> {
  for (const key of apiKeys()) {
    try {
      const res = await fetch(`${CHARIOW_API}/sales/${encodeURIComponent(saleId)}`, {
        headers: { Authorization: `Bearer ${key}` },
        cache: 'no-store',
      });
      if (!res.ok) continue;
      const sale = (await res.json())?.data;
      if (!sale) continue;
      const name = (sale?.customer?.name as string | undefined)?.trim() || null;
      const rawPhone = sale?.customer?.phone?.number;
      const phone = rawPhone ? String(rawPhone).replace(/\D/g, '') || null : null;
      return { name, phone };
    } catch {
      /* clé suivante */
    }
  }
  return null;
}

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });
  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!prof?.is_admin) return NextResponse.json({ error: 'Réservé aux administrateurs.' }, { status: 403 });

  // Ventes des 3 formules sans téléphone enregistré
  const { data: pending, count } = await supabase
    .from('chariow_purchases')
    .select('sale_id', { count: 'exact' })
    .in('plan', ['1x', '3x', '6x'])
    .is('customer_phone', null)
    .order('created_at', { ascending: false })
    .limit(BATCH);

  const list = pending ?? [];
  let done = 0;
  let failed = 0;

  for (const row of list) {
    const info = await fetchSale(row.sale_id);
    if (info) {
      // 'aucun' si Chariow n'a pas de numéro → la vente ne sera pas retraitée
      const { error } = await supabase.rpc('closer_set_customer', {
        p_sale_id: row.sale_id,
        p_name: info.name,
        p_phone: info.phone ?? 'aucun',
      });
      if (error) failed++;
      else done++;
    } else {
      failed++;
    }
    await new Promise((r) => setTimeout(r, 120)); // douceur avec l'API Chariow
  }

  const remaining = Math.max(0, (count ?? list.length) - done);
  return NextResponse.json({ ok: true, traitees: done, echecs: failed, restantes: remaining });
}
