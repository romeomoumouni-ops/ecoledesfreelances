import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Webhook Chariow (« Pulse ») — événement `successful.sale`.
 *
 * Sécurité (les Pulses Chariow n'ont pas de signature fiable documentée) :
 * 1. L'URL exige un token secret (?token=...) connu de nous seuls.
 * 2. On ne fait JAMAIS confiance au corps reçu : la vente est re-vérifiée
 *    auprès de l'API Chariow (GET /v1/sales/{id}) avec notre clé API.
 *    L'e-mail et le produit utilisés sont ceux confirmés par l'API.
 * 3. L'attribution passe par une RPC SECURITY DEFINER protégée par un
 *    second secret, et est idempotente (sale_id unique).
 */

const CHARIOW_API = 'https://api.chariow.com/v1';

// Produits reconnus (les autres ventes sont ignorées)
const PRODUCTS = new Set(['prd_97u01b', 'prd_ocqbu9', 'prd_mq2c4np5']);

function apiKeys(): string[] {
  return [process.env.CHARIOW_API_KEY, process.env.CHARIOW_API_KEY_2].filter(
    (k): k is string => !!k
  );
}

type VerifiedSale = { email: string; productId: string; status: string; amount: number | null };

/** Vérifie la vente auprès de Chariow (essaie chaque clé API configurée : une par boutique). */
async function verifySale(saleId: string): Promise<VerifiedSale | null> {
  for (const key of apiKeys()) {
    try {
      const res = await fetch(`${CHARIOW_API}/sales/${encodeURIComponent(saleId)}`, {
        headers: { Authorization: `Bearer ${key}` },
        cache: 'no-store',
      });
      if (!res.ok) continue; // 404 sur cette boutique -> essayer la clé suivante
      const json = await res.json();
      const sale = json?.data;
      if (!sale) continue;
      const email = sale?.customer?.email;
      const productId = sale?.product?.id;
      const status = sale?.status;
      const rawAmount = sale?.amount?.value;
      const amount = typeof rawAmount === 'number' && rawAmount > 0 ? rawAmount : null;
      if (email && productId) return { email, productId, status, amount };
    } catch {
      // réseau : on tentera la clé suivante ; si tout échoue -> 500 plus bas (Chariow réessaie)
    }
  }
  return null;
}

function checkToken(req: NextRequest): boolean {
  const expected = process.env.CHARIOW_WEBHOOK_TOKEN;
  return !!expected && req.nextUrl.searchParams.get('token') === expected;
}

export async function GET(req: NextRequest) {
  if (!checkToken(req)) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, service: 'webhook-chariow' });
}

export async function POST(req: NextRequest) {
  if (!checkToken(req)) return NextResponse.json({ ok: false }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const event = String(body?.event ?? '');
  // Seules les ventes réussies nous intéressent (on accuse réception du reste)
  if (event !== 'successful.sale' && event !== 'successful_sale') {
    return NextResponse.json({ ok: true, ignored: event });
  }

  const sale = body?.sale as { id?: string } | undefined;
  const saleId = sale?.id;
  if (!saleId) return NextResponse.json({ ok: false, error: 'missing_sale_id' }, { status: 400 });

  // Re-vérification auprès de l'API Chariow (source de vérité)
  const verified = await verifySale(saleId);
  if (!verified) {
    // Vente introuvable avec nos clés : soit fausse requête, soit indispo réseau.
    // 500 => Chariow réessaie plus tard (1 min, 5 min, 30 min, 2 h, 24 h).
    return NextResponse.json({ ok: false, error: 'sale_not_verified' }, { status: 500 });
  }
  if (!['completed', 'settled'].includes(verified.status)) {
    return NextResponse.json({ ok: true, ignored: `status_${verified.status}` });
  }
  if (!PRODUCTS.has(verified.productId)) {
    return NextResponse.json({ ok: true, ignored: `product_${verified.productId}` });
  }

  // Attribution de l'accès (idempotente)
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data, error } = await supabase.rpc('chariow_grant_access', {
    p_secret: process.env.CHARIOW_GRANT_SECRET,
    p_email: verified.email,
    p_product: verified.productId,
    p_sale_id: saleId,
    p_amount: verified.amount,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, result: data });
}
