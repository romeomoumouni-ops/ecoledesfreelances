import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Abonnement AI Post Maker — paiement direct via l'API Chariow.
 * On crée le checkout côté serveur avec l'e-mail DU COMPTE (crédit garanti sur
 * le bon e-mail par le webhook) et on renvoie l'URL de la page de PAIEMENT
 * (Mobile Money / carte) pour redirection immédiate, sans passer par le
 * formulaire boutique. Repli : lien boutique classique.
 */

const FALLBACK_STORE_LINK = 'https://romeomoumouni.mychariow.shop/prd_n52m1d5e/checkout';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  let body: { phone?: string; country?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const phone = (body.phone ?? '').replace(/\D/g, '');
  const country = (body.country ?? 'BJ').toUpperCase().slice(0, 2);

  const product = process.env.POST_MAKER_PRODUCT || 'prd_n52m1d5e';
  const apiKeys = [process.env.CHARIOW_API_KEY, process.env.CHARIOW_API_KEY_2].filter(
    (k): k is string => !!k
  );
  if (!product || !apiKeys.length) {
    return NextResponse.json({ fallback: FALLBACK_STORE_LINK });
  }
  if (phone.length < 6 || phone.length > 15) {
    return NextResponse.json(
      { error: 'Entre ton numéro de téléphone (celui de ton compte Mobile Money).' },
      { status: 400 }
    );
  }

  const { data: prof } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();
  const email = (prof?.email || user.email || '').toLowerCase();
  const parts = (prof?.full_name || 'Membre Ecole').trim().split(/\s+/);
  const firstName = (parts[0] || 'Membre').slice(0, 50);
  const lastName = (parts.slice(1).join(' ') || 'Freelance').slice(0, 50);

  for (const apiKey of apiKeys) {
    try {
      const res = await fetch('https://api.chariow.com/v1/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product,
          email,
          first_name: firstName,
          last_name: lastName,
          phone: { number: phone, country_code: country },
          redirect_url: 'https://www.lecoledesfreelances.com/ai-post-maker',
          custom_metadata: { source: 'post-maker', user_id: user.id },
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
          /* URL inattendue : renvoyée telle quelle */
        }
        return NextResponse.json({ url: payUrl });
      }
      if (res.status === 404) continue; // produit absent de cette boutique -> clé suivante
      return NextResponse.json({ fallback: FALLBACK_STORE_LINK });
    } catch {
      /* réseau : clé suivante */
    }
  }
  return NextResponse.json({ fallback: FALLBACK_STORE_LINK });
}
