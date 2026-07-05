import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { joinGhostEmail } from '@/lib/ghost-email';

export const dynamic = 'force-dynamic';

// Produits d'accès à l'école (page de vente).
const PRODUCTS: Record<'1x' | '3x', string> = { '1x': 'prd_97u01b', '3x': 'prd_ocqbu9' };
const FALLBACK: Record<'1x' | '3x', string> = {
  '1x': 'https://romeomoumouni.mychariow.store/prd_97u01b/checkout',
  '3x': 'https://romeomoumouni.mychariow.store/prd_ocqbu9/checkout',
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
  const plan: '1x' | '3x' = body.plan === '3x' ? '3x' : '1x';

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Entre une adresse e-mail valide.' }, { status: 400 });
  }
  if (phone.length < 6 || phone.length > 15) {
    return NextResponse.json({ error: 'Entre ton numéro Mobile Money.' }, { status: 400 });
  }

  const product = PRODUCTS[plan];
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
          phone: { number: phone, country_code: country },
          redirect_url: 'https://www.lecoledesfreelances.com/inscription',
          custom_metadata: { source: 'join', plan, real_email: email },
        }),
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      const step = json?.data?.step;
      const url = json?.data?.payment?.checkout_url;
      if (res.ok && step === 'payment' && url) {
        let payUrl = url as string;
        try {
          const u = new URL(payUrl);
          u.searchParams.set('country', country);
          u.searchParams.set('phone', phone);
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
