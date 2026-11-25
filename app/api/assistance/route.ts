import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { sendLoginReminderEmailDetailed, sendWelcomeEmailDetailed } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Assistant public /assistance : « ai-je bien payé ? ».
 * 1) notre base (alimentée par Chariow à chaque vente) ;
 * 2) sinon Chariow en direct (client → ventes réussies) : si une vente d'accès
 *    est trouvée, l'accès est accordé tout de suite (rattrapage d'un webhook manqué).
 * Anti-abus : 15 vérifications par heure et par adresse IP.
 */
const SECRET = () => process.env.CHARIOW_GRANT_SECRET;
const CHARIOW_API = 'https://api.chariow.com/v1';
const ACCESS_PRODUCTS = new Set(['prd_hbt9urwj', 'prd_3ecdmzhc', 'prd_b4ip13ur', 'prd_97u01b', 'prd_ocqbu9', 'prd_mq2c4np5']);
const PAID = new Set(['completed', 'settled']);

type Lookup = {
  found: boolean;
  email: string;
  has_account: boolean;
  access_active?: boolean;
  plan?: string;
  suggestions?: string[];
};

function supabase() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

function ipHash(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0';
  return createHash('sha256').update(ip + '|' + (SECRET() ?? '')).digest('hex').slice(0, 32);
}

type ChariowSale = {
  id: string;
  status: string;
  product?: { id?: string };
  amount?: { value?: number };
  customer?: { email?: string; name?: string; phone?: { number?: string } };
};

/** Ventes d'accès réussies chez Chariow pour cette adresse exacte. */
async function chariowPaidSales(email: string): Promise<ChariowSale[]> {
  const keys = [process.env.CHARIOW_API_KEY, process.env.CHARIOW_API_KEY_2].filter((k): k is string => !!k);
  const out: ChariowSale[] = [];
  for (const key of keys) {
    try {
      const h = { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' as const };
      const cr = await fetch(`${CHARIOW_API}/customers?per_page=20&search=${encodeURIComponent(email)}`, h);
      if (!cr.ok) continue;
      const customers = ((await cr.json())?.data ?? []) as { id: string; email?: string }[];
      for (const c of customers.filter((c) => (c.email ?? '').toLowerCase() === email)) {
        const sr = await fetch(`${CHARIOW_API}/sales?per_page=50&customer_id=${encodeURIComponent(c.id)}`, h);
        if (!sr.ok) continue;
        const sales = ((await sr.json())?.data ?? []) as ChariowSale[];
        out.push(...sales.filter((s) => PAID.has(s.status) && ACCESS_PRODUCTS.has(s.product?.id ?? '')));
      }
    } catch {
      /* Chariow injoignable : on s'en tient à notre base */
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  let email = '';
  try {
    email = String((await req.json())?.email ?? '').trim().toLowerCase();
  } catch {
    /* vide */
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    return NextResponse.json({ status: 'invalid' });
  }

  const sb = supabase();
  const ip = ipHash(req);
  const { data: used } = await sb.rpc('assistance_quota', { p_secret: SECRET(), p_ip_hash: ip });
  if (typeof used === 'number' && used >= 15) return NextResponse.json({ status: 'too_many' });

  const lookup = async () => {
    const { data } = await sb.rpc('support_lookup', { p_secret: SECRET(), p_email: email });
    return (data ?? { found: false, email, has_account: false }) as Lookup;
  };

  let lk = await lookup();
  let rattrape = false;
  if (!lk.found) {
    // Rattrapage : la vente existe chez Chariow mais n'est jamais arrivée chez nous.
    const sales = await chariowPaidSales(email);
    for (const s of sales) {
      await sb.rpc('chariow_grant_access', {
        p_secret: SECRET(),
        p_email: email,
        p_product: s.product?.id,
        p_sale_id: s.id,
        p_amount: typeof s.amount?.value === 'number' && s.amount.value > 0 ? s.amount.value : null,
        p_name: s.customer?.name ?? null,
        p_phone: s.customer?.phone?.number ? String(s.customer.phone.number).replace(/\D/g, '') : null,
      });
    }
    if (sales.length) {
      lk = await lookup();
      rattrape = lk.found;
    }
  }

  let result: string;
  let emailSent = false;
  if (!lk.found) {
    result = 'not_found';
  } else if (lk.access_active === false) {
    result = 'expired';
  } else {
    result = lk.has_account ? 'paid_account' : 'paid_new';
    // Les consignes partent aussi par e-mail (au plus une fois par 24 h et par adresse).
    const { data: recent } = await sb.rpc('support_recent_send', { p_secret: SECRET(), p_email: lk.email });
    if (!recent) {
      const r = lk.has_account ? await sendLoginReminderEmailDetailed(lk.email) : await sendWelcomeEmailDetailed(lk.email);
      if (r.ok) {
        emailSent = true;
        await sb.rpc('support_record_send', { p_secret: SECRET(), p_email: lk.email });
      }
    }
  }
  await sb.rpc('assistance_log', { p_secret: SECRET(), p_ip_hash: ip, p_email: email, p_result: rattrape ? `${result}_rattrape` : result });

  return NextResponse.json({
    status: result,
    email: lk.email,
    email_sent: emailSent,
    suggestions: lk.found ? [] : (lk.suggestions ?? []).slice(0, 3),
  });
}
