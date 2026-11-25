import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { sendLoginReminderEmailDetailed, sendWelcomeEmailDetailed } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Assistant public /assistance. Un seul rôle : donner les accès aux personnes
 * qui ont DÉJÀ payé. Pas d'IA générative, des réponses fixes :
 * - message avec une adresse e-mail → vérification du paiement
 *   (notre base, puis Chariow en direct, avec rattrapage de l'accès) ;
 * - « oui » (j'ai payé) → on demande l'adresse du paiement ;
 * - « non / pas encore » → lien de paiement ;
 * - tout autre message → recentrage.
 * Chaque échange est enregistré (support_chats, source 'assistance') pour l'espace admin.
 * Anti-abus : 25 messages/h par discussion, 60/h par IP, 15 vérifications/h par IP.
 */
const SECRET = () => process.env.CHARIOW_GRANT_SECRET;
const COOKIE = 'assist_sid';
const CHARIOW_API = 'https://api.chariow.com/v1';
const ACCESS_PRODUCTS = new Set(['prd_hbt9urwj', 'prd_3ecdmzhc', 'prd_b4ip13ur', 'prd_97u01b', 'prd_ocqbu9', 'prd_mq2c4np5']);
const PAID = new Set(['completed', 'settled']);
const EMAIL_RE = /[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}/i;
const PAY_LINK = 'https://www.romeomoumouni.com/rejoindre-ecole-des-freelances';

export type Kind =
  | 'paid_new'
  | 'paid_account'
  | 'expired'
  | 'not_found'
  | 'ask_email'
  | 'pay_link'
  | 'recentrage'
  | 'invalid'
  | 'too_many';

/** Version texte de chaque réponse, pour l'historique de l'espace admin. */
function texte(kind: Kind, email?: string, suggestions?: string[]): string {
  switch (kind) {
    case 'paid_new':
      return `Paiement confirmé pour ${email}. Consignes affichées : créer son compte sur /inscription avec cette adresse, créer son mot de passe, entrer sur la plateforme.`;
    case 'paid_account':
      return `Paiement confirmé pour ${email}, compte déjà créé. Consignes affichées : se connecter sur /connexion avec cette adresse et son mot de passe.`;
    case 'expired':
      return `Paiement enregistré pour ${email}, mais une échéance est à régler. Invitation à se connecter pour payer la tranche.`;
    case 'not_found':
      return suggestions?.length
        ? `Aucun paiement pour ${email}. Suggestion : ${suggestions.join(', ')}. As-tu déjà payé ?`
        : `Aucun paiement trouvé pour ${email}. As-tu déjà payé ? (Oui / Non)`;
    case 'ask_email':
      return "Donne-moi l'adresse e-mail avec laquelle tu as effectué ton paiement.";
    case 'pay_link':
      return `Effectue ton paiement ici pour rejoindre l'incubateur : ${PAY_LINK}. Reviens ensuite avec l'adresse e-mail du paiement.`;
    case 'recentrage':
      return `Je suis ici pour donner les accès aux personnes qui ont déjà payé pour rejoindre l'incubateur. Si tu n'as pas encore effectué ton paiement, effectue-le avant : ${PAY_LINK}. Si tu as déjà effectué ton paiement, donne-moi le mail avec lequel tu as effectué ton paiement.`;
    case 'too_many':
      return 'Trop de messages : pause de quelques minutes demandée.';
    default:
      return 'Adresse e-mail invalide, demande de la retaper.';
  }
}

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

type Lookup = { found: boolean; email: string; has_account: boolean; access_active?: boolean; plan?: string; suggestions?: string[] };

export async function POST(req: NextRequest) {
  let message = '';
  let intent = '';
  try {
    const b = await req.json();
    message = String(b?.message ?? '').trim().slice(0, 500);
    intent = String(b?.intent ?? '');
  } catch {
    /* vide */
  }
  if (!message) return NextResponse.json({ kind: 'invalid' });

  const sb = supabase();
  const ip = ipHash(req);
  let sid = req.cookies.get(COOKIE)?.value ?? '';
  const fresh = !/^[0-9a-f-]{36}$/i.test(sid);
  if (fresh) sid = randomUUID();

  const respond = (body: Record<string, unknown>) => {
    const res = NextResponse.json(body);
    if (fresh) res.cookies.set(COOKIE, sid, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 30 });
    return res;
  };

  const { data: h } = await sb.rpc('support_history', { p_secret: SECRET(), p_chat_id: sid, p_ip_hash: ip });
  const hist = (h ?? { chat_last_hour: 0, ip_last_hour: 0 }) as { chat_last_hour: number; ip_last_hour: number };
  if (hist.chat_last_hour >= 25 || hist.ip_last_hour >= 60) return respond({ kind: 'too_many' });

  const log = async (role: 'user' | 'assistant' | 'note', body: string, verified?: string | null, outcome?: string | null) => {
    await sb.rpc('support_log', {
      p_secret: SECRET(), p_chat_id: sid, p_role: role, p_body: body, p_ip_hash: ip,
      p_verified_email: verified ?? null, p_outcome: null,
    });
    await sb.rpc('assistance_mark_chat', { p_secret: SECRET(), p_chat_id: sid, p_outcome: outcome ?? null });
  };

  await log('user', message);

  const found = message.match(EMAIL_RE)?.[0]?.toLowerCase();

  // ── Pas d'adresse : oui / non / autre sujet ──
  if (!found) {
    const t = message.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let kind: Kind;
    if (intent === 'paid_yes' || /^(oui|ouais|yes|yep|deja|j'?ai (deja )?paye|c'?est fait|oui j'?ai paye)\b/.test(t)) kind = 'ask_email';
    else if (intent === 'paid_no' || /^(non|no|nope|pas encore|pas encore paye|je n'?ai pas (encore )?paye)\b/.test(t)) kind = 'pay_link';
    else kind = 'recentrage';
    await log('assistant', texte(kind), null, kind === 'pay_link' ? 'prospect' : null);
    return respond({ kind });
  }

  // ── Vérification du paiement ──
  const { data: used } = await sb.rpc('assistance_quota', { p_secret: SECRET(), p_ip_hash: ip });
  if (typeof used === 'number' && used >= 15) {
    await log('assistant', texte('too_many'));
    return respond({ kind: 'too_many' });
  }
  const lookup = async () => {
    const { data } = await sb.rpc('support_lookup', { p_secret: SECRET(), p_email: found });
    return (data ?? { found: false, email: found, has_account: false }) as Lookup;
  };

  let lk = await lookup();
  let rattrape = false;
  if (!lk.found) {
    // Rattrapage : la vente existe chez Chariow mais n'est jamais arrivée chez nous.
    const sales = await chariowPaidSales(found);
    for (const s of sales) {
      await sb.rpc('chariow_grant_access', {
        p_secret: SECRET(),
        p_email: found,
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

  let kind: Kind;
  let outcome: string;
  let emailSent = false;
  const notes: string[] = [];
  if (!lk.found) {
    kind = 'not_found';
    outcome = 'not_found';
    notes.push(`🔎 ${found} → aucun paiement (base + Chariow)${lk.suggestions?.length ? ` · suggestions : ${lk.suggestions.join(', ')}` : ''}`);
  } else if (lk.access_active === false) {
    kind = 'expired';
    outcome = 'paid_expired';
    notes.push(`🔎 ${lk.email} → PAYÉ (${lk.plan}) · échéance à régler`);
  } else {
    kind = lk.has_account ? 'paid_account' : 'paid_new';
    notes.push(`🔎 ${lk.email} → PAYÉ (${lk.plan})${rattrape ? ' · accès rattrapé depuis Chariow' : ''} · compte : ${lk.has_account ? 'oui' : 'non'}`);
    // Les consignes partent aussi par e-mail (au plus une fois par 24 h et par adresse).
    const { data: recent } = await sb.rpc('support_recent_send', { p_secret: SECRET(), p_email: lk.email });
    if (recent) {
      notes.push(`✉️ Consignes déjà envoyées à ${lk.email} il y a moins de 24 h`);
    } else {
      const r = lk.has_account ? await sendLoginReminderEmailDetailed(lk.email) : await sendWelcomeEmailDetailed(lk.email);
      emailSent = r.ok;
      if (r.ok) {
        await sb.rpc('support_record_send', { p_secret: SECRET(), p_email: lk.email });
        notes.push(`✉️ Consignes envoyées par e-mail à ${lk.email}`);
      } else {
        notes.push(`✉️ ÉCHEC d'envoi à ${lk.email} : ${r.error ?? 'erreur inconnue'}`);
      }
    }
    outcome = emailSent ? (lk.has_account ? 'paid_has_account_sent' : 'paid_sent') : lk.has_account ? 'paid_has_account' : 'paid_no_account';
  }

  const suggestions = lk.found ? [] : (lk.suggestions ?? []).slice(0, 3);
  await sb.rpc('assistance_log', { p_secret: SECRET(), p_ip_hash: ip, p_email: found, p_result: rattrape ? `${kind}_rattrape` : kind });
  for (const n of notes) await log('note', n);
  await log('assistant', texte(kind, lk.email, suggestions), lk.found ? lk.email : null, outcome);

  return respond({ kind, email: lk.email, email_sent: emailSent, suggestions });
}
