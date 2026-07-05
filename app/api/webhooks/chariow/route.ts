import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { sendWelcomeEmail, sendCoachRechargeEmail, sendPostMakerEmail } from '@/lib/email';
import { parseGhostUserId, parseJoinToken } from '@/lib/ghost-email';

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

// Produits d'accès à la plateforme (1x / 3x / 6x)
const ACCESS_PRODUCTS = new Set(['prd_97u01b', 'prd_ocqbu9', 'prd_mq2c4np5']);
// Recharges de questions du Super Coach (1500 FCFA = +15 questions) :
// prd_v19rl2tn = produit « service » (lien boutique) ; CHARIOW_CREDIT_PRODUCT =
// produit « licence » acheté via l'API checkout (paiement direct).
function coachProducts(): Set<string> {
  // prd_v19rl2tn = ancien produit « service » (lien boutique, conservé en secours)
  // prd_8k589bq5 = produit « licence » (paiement direct via l'API checkout)
  const s = new Set(['prd_v19rl2tn', 'prd_8k589bq5']);
  if (process.env.CHARIOW_CREDIT_PRODUCT) s.add(process.env.CHARIOW_CREDIT_PRODUCT);
  return s;
}
// Abonnement AI Post Maker (produit « licence », payable chaque mois pour +30 jours).
function postMakerProducts(): Set<string> {
  const s = new Set(['prd_n52m1d5e']);
  if (process.env.POST_MAKER_PRODUCT) s.add(process.env.POST_MAKER_PRODUCT);
  return s;
}
function allProducts(): Set<string> {
  return new Set([...ACCESS_PRODUCTS, ...coachProducts(), ...postMakerProducts()]);
}

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
  const tokenOk = checkToken(req);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* on garde body = {} et on journalise quand même */
  }

  const event = String(body?.event ?? '');
  const sale = body?.sale as { id?: string } | undefined;
  const saleId = sale?.id ?? null;

  // Client Supabase + journalisation. On log TOUT appel entrant (même token invalide
  // ou événement non-vente) pour diagnostiquer ce que Chariow envoie réellement.
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const log = (outcome: string, extra?: { product?: string; email?: string; status?: string }) =>
    supabase.rpc('log_webhook_event', {
      p_event: event, p_sale_id: saleId, p_email: extra?.email ?? null,
      p_product: extra?.product ?? null, p_status: extra?.status ?? null,
      p_outcome: outcome, p_raw: body,
    });

  await log(tokenOk ? 'received' : 'bad_token');

  if (!tokenOk) return NextResponse.json({ ok: false }, { status: 401 });
  // Seules les ventes réussies nous intéressent (on accuse réception du reste)
  if (event !== 'successful.sale' && event !== 'successful_sale') {
    await log('event_ignored');
    return NextResponse.json({ ok: true, ignored: event });
  }
  if (!saleId) {
    await log('missing_sale_id');
    return NextResponse.json({ ok: false, error: 'missing_sale_id' }, { status: 400 });
  }

  // Re-vérification auprès de l'API Chariow (source de vérité)
  const verified = await verifySale(saleId);
  if (!verified) {
    // Vente introuvable avec nos clés : soit fausse requête, soit indispo réseau.
    // 500 => Chariow réessaie plus tard (1 min, 5 min, 30 min, 2 h, 24 h).
    await log('not_verified');
    return NextResponse.json({ ok: false, error: 'sale_not_verified' }, { status: 500 });
  }
  if (!['completed', 'settled'].includes(verified.status)) {
    await log('status_ignored', { product: verified.productId, email: verified.email, status: verified.status });
    return NextResponse.json({ ok: true, ignored: `status_${verified.status}` });
  }
  if (!allProducts().has(verified.productId)) {
    await log('product_ignored', { product: verified.productId, email: verified.email, status: verified.status });
    return NextResponse.json({ ok: true, ignored: `product_${verified.productId}` });
  }

  // Adresse fantôme -> vraie adresse du compte (pour créditer le bon compte
  // et lui envoyer NOTRE e-mail à la place de celui de Chariow).
  const ghostUid = parseGhostUserId(verified.email);
  const joinToken = parseJoinToken(verified.email);
  let effectiveEmail = verified.email;
  if (ghostUid) {
    const { data: real } = await supabase.rpc('resolve_user_email', {
      p_secret: process.env.CHARIOW_GRANT_SECRET,
      p_user_id: ghostUid,
    });
    if (typeof real === 'string' && real) effectiveEmail = real;
  } else if (joinToken) {
    // Achat depuis la page de vente : le token renvoie au vrai e-mail du prospect.
    const { data: real } = await supabase.rpc('resolve_pending_email', {
      p_secret: process.env.CHARIOW_GRANT_SECRET,
      p_token: joinToken,
    });
    if (typeof real === 'string' && real) effectiveEmail = real;
  }

  // Routage selon le produit : abonnement AI Post Maker, recharge de questions, ou accès plateforme
  const { data, error } =
    postMakerProducts().has(verified.productId)
      ? await supabase.rpc('chariow_grant_post_maker', {
          p_secret: process.env.CHARIOW_GRANT_SECRET,
          p_email: effectiveEmail,
          p_sale_id: saleId,
          p_amount: verified.amount,
        })
      : coachProducts().has(verified.productId)
      ? await supabase.rpc('chariow_add_coach_questions', {
          p_secret: process.env.CHARIOW_GRANT_SECRET,
          p_email: effectiveEmail,
          p_sale_id: saleId,
          p_amount: verified.amount,
          p_product: verified.productId,
        })
      : await supabase.rpc('chariow_grant_access', {
          p_secret: process.env.CHARIOW_GRANT_SECRET,
          p_email: effectiveEmail,
          p_product: verified.productId,
          p_sale_id: saleId,
          p_amount: verified.amount,
        });

  await log(error ? `rpc_error:${error.message.slice(0, 120)}` : `ok:${JSON.stringify(data).slice(0, 150)}`, {
    product: verified.productId, email: verified.email, status: verified.status,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Nos e-mails de confirmation (Chariow n'envoie plus les siens grâce à l'adresse fantôme).
  const r = data as { status?: string; payments_count?: number; valid_until?: string; allowance?: number } | null;
  if (r?.status === 'granted') {
    if (postMakerProducts().has(verified.productId)) {
      await sendPostMakerEmail(effectiveEmail, r.valid_until ?? null);
    } else if (coachProducts().has(verified.productId)) {
      await sendCoachRechargeEmail(effectiveEmail, r.allowance ?? 15);
    } else if (ACCESS_PRODUCTS.has(verified.productId) && r.payments_count === 1) {
      // Accès plateforme : e-mail de bienvenue à la 1re activation seulement.
      await sendWelcomeEmail(effectiveEmail);
    }
  }

  return NextResponse.json({ ok: true, result: data });
}
