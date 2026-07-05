import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ghostEmail } from '@/lib/ghost-email';

export const dynamic = 'force-dynamic';

/**
 * Recharge de questions du Super Coach — paiement direct via l'API Chariow.
 *
 * Au lieu d'envoyer l'élève sur la page boutique (où il retape son e-mail,
 * avec risque d'erreur), on crée le checkout côté serveur avec l'e-mail DU
 * COMPTE (crédit automatique garanti sur le bon e-mail) et on renvoie
 * l'URL de la page de PAIEMENT (Mobile Money / carte) pour redirection
 * immédiate. La créditation reste faite par le webhook (successful.sale).
 *
 * Repli : si le produit « licence » n'est pas configuré (CHARIOW_CREDIT_PRODUCT)
 * ou que l'API échoue, on renvoie le lien boutique classique.
 */

const FALLBACK_STORE_LINK = 'https://romeomoumouni.mychariow.shop/prd_v19rl2tn/checkout';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const { data: access } = await supabase.rpc('get_my_access');
  if ((access as { active?: boolean } | null)?.active !== true) {
    return NextResponse.json({ error: 'Accès inactif.' }, { status: 403 });
  }

  let body: { phone?: string; country?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const phone = (body.phone ?? '').replace(/\D/g, '');
  const country = (body.country ?? 'BJ').toUpperCase().slice(0, 2);

  // Produit « Crédit IA super coach » (type licence — requis par l'API checkout)
  const product = process.env.CHARIOW_CREDIT_PRODUCT || 'prd_8k589bq5';
  // Le produit licence peut vivre sur l'une ou l'autre boutique : on essaie
  // chaque clé API configurée (une par boutique).
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
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Adresse fantôme : Chariow n'envoie pas ses e-mails au client (voir lib/ghost-email).
          product_id: product,
          email: ghostEmail(user.id),
          first_name: firstName,
          last_name: lastName,
          phone: { number: phone, country_code: country },
          redirect_url: 'https://www.lecoledesfreelances.com/super-coach',
          custom_metadata: { source: 'super-coach', user_id: user.id, real_email: email },
        }),
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      const step = json?.data?.step;
      const url = json?.data?.payment?.checkout_url;

      if (res.ok && step === 'payment' && url) {
        // Moneroo présélectionne le pays d'après l'IP du serveur (US sur Vercel) :
        // on force le pays et le numéro choisis par l'élève dans l'URL de paiement.
        let payUrl = url as string;
        try {
          const u = new URL(payUrl);
          u.searchParams.set('country', country);
          u.searchParams.set('phone', phone);
          payUrl = u.toString();
        } catch {
          // URL inattendue : on la renvoie telle quelle
        }
        return NextResponse.json({ url: payUrl });
      }
      // Produit introuvable sur cette boutique -> on essaie la clé suivante
      if (res.status === 404) continue;
      // Autre réponse inattendue -> boutique en secours
      return NextResponse.json({ fallback: FALLBACK_STORE_LINK });
    } catch {
      // réseau : essayer la clé suivante
    }
  }
  return NextResponse.json({ fallback: FALLBACK_STORE_LINK });
}
