import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { joinGhostEmail } from '@/lib/ghost-email';

export const dynamic = 'force-dynamic';

// Produits d'accès à l'école (page de vente).
// '1x200' = l'offre actuelle : 200 000 FCFA en UNE FOIS, accès à vie.
// '1x'/'3x' = anciennes formules, conservées pour les liens déjà en circulation.
// Produits « clé de licence » de la page de vente (paiement direct via l'API).
type Plan = '1x' | '3x' | '1x200';

const PRODUCTS: Record<Plan, string> = {
  '1x': 'prd_hbt9urwj',   // 98 000 FCFA, accès à vie
  '3x': 'prd_3ecdmzhc',   // 45 000 FCFA × 3
  '1x200': 'prd_b4ip13ur', // ancienne offre à 200 000 (liens encore en circulation)
};
const FALLBACK: Record<Plan, string> = {
  '1x': 'https://romeomoumouni.mychariow.shop/prd_hbt9urwj/checkout',
  '3x': 'https://romeomoumouni.mychariow.shop/prd_3ecdmzhc/checkout',
  '1x200': 'https://romeomoumouni.mychariow.shop/prd_b4ip13ur/checkout',
};

export async function POST(req: NextRequest) {
  const supabase = createClient();

  let body: { email?: string; name?: string; phone?: string; country?: string; plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const name = (body.name ?? '').trim().slice(0, 80);
  const phone = (body.phone ?? '').replace(/\D/g, '');
  const country = (body.country ?? 'BJ').toUpperCase().slice(0, 2);
  const plan: Plan = body.plan === '3x' ? '3x' : body.plan === '1x200' ? '1x200' : '1x';

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Entre une adresse e-mail valide.' }, { status: 400 });
  }
  const product = PRODUCTS[plan];
  // Offre pas encore ouverte (produit Chariow non créé) : on ne laisse jamais
  // partir un paiement dans le vide.
  if (!product) {
    return NextResponse.json({ error: 'Cette formule n’est pas encore disponible.' }, { status: 400 });
  }
  const apiKeys = [process.env.CHARIOW_API_KEY, process.env.CHARIOW_API_KEY_2].filter(
    (k): k is string => !!k
  );
  if (!apiKeys.length) return NextResponse.json({ fallback: FALLBACK[plan] });

  // Token -> vrai e-mail (stocké côté serveur). L'adresse fantôme portera ce token.
  const { data: token, error: tErr } = await supabase.rpc('create_pending_checkout', {
    p_email: email, p_name: name, p_plan: plan,
  });
  if (tErr || !token || typeof token !== 'string') {
    return NextResponse.json({ fallback: FALLBACK[plan] });
  }

  const parts = (name || 'Membre Ecole').split(/\s+/);
  const firstName = (parts[0] || 'Membre').slice(0, 50);
  const lastName = (parts.slice(1).join(' ') || 'Freelance').slice(0, 50);

  for (const apiKey of apiKeys) {
    try {
      const res = await fetch('https://api.chariow.com/v1/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product,
          email: joinGhostEmail(token), // adresse fantôme : Chariow n'envoie pas ses e-mails
          first_name: firstName,
          last_name: lastName,
          ...(phone.length >= 6 ? { phone: { number: phone, country_code: country } } : {}),
          redirect_url: 'https://www.lecoledesfreelances.com/inscription',
          custom_metadata: { source: 'join', plan, real_email: email },
        }),
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      const step = json?.data?.step;
      const url = json?.data?.payment?.checkout_url;

      // Diagnostic : on journalise la réponse exacte de l'API Chariow.
      await supabase.rpc('log_webhook_event', {
        p_event: 'join_checkout',
        p_sale_id: null,
        p_email: email,
        p_product: product,
        p_status: String(res.status),
        p_outcome: `step=${step ?? '-'} | msg=${String(json?.message ?? '').slice(0, 160)} | errors=${JSON.stringify(json?.errors ?? '').slice(0, 200)}`,
        p_raw: json ?? {},
      });

      if (res.ok && step === 'payment' && url) {
        let payUrl = url as string;
        try {
          const u = new URL(payUrl);
          if (country) u.searchParams.set('country', country);
          if (phone.length >= 6) u.searchParams.set('phone', phone);
          payUrl = u.toString();
        } catch {
          /* URL inattendue */
        }
        return NextResponse.json({ url: payUrl });
      }
      if (res.status === 404) continue;
      return NextResponse.json({ fallback: FALLBACK[plan] });
    } catch {
      /* clé suivante */
    }
  }
  return NextResponse.json({ fallback: FALLBACK[plan] });
}
