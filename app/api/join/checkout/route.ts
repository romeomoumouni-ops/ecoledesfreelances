import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { joinGhostEmail } from '@/lib/ghost-email';
import { variantesNumero } from '@/lib/phone';

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
  if (!apiKeys.length) {
    return NextResponse.json({ error: 'Le paiement est momentanément indisponible. Réessaie dans quelques minutes.' }, { status: 503 });
  }

  // Token -> vrai e-mail (stocké côté serveur). L'adresse fantôme portera ce token.
  const { data: token, error: tErr } = await supabase.rpc('create_pending_checkout', {
    p_email: email, p_name: name, p_plan: plan,
  });
  if (tErr || !token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Le paiement n’a pas pu démarrer. Réessaie dans un instant.' }, { status: 500 });
  }

  const parts = (name || 'Membre Ecole').split(/\s+/);
  const firstName = (parts[0] || 'Membre').slice(0, 50);
  const lastName = (parts.slice(1).join(' ') || 'Freelance').slice(0, 50);

  const numeros = variantesNumero(phone, country);
  if (!numeros.length) {
    return NextResponse.json({ error: 'Entre ton numéro Mobile Money.' }, { status: 400 });
  }

  let dernierMessage = '';
  // On n'envoie JAMAIS l'élève vers le formulaire Chariow : on tente chaque
  // écriture possible du numéro, et sinon on lui explique quoi corriger.
  for (const apiKey of apiKeys) {
    for (const numero of numeros) {
      try {
        const res = await fetch('https://api.chariow.com/v1/checkout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: product,
            email: joinGhostEmail(token), // adresse fantôme : Chariow n'envoie pas ses e-mails
            first_name: firstName,
            last_name: lastName,
            phone: { number: numero, country_code: country },
            redirect_url: 'https://www.lecoledesfreelances.com/inscription',
            custom_metadata: { source: 'join', plan, real_email: email },
          }),
          cache: 'no-store',
        });
        const json = await res.json().catch(() => null);
        const step = json?.data?.step;
        const url = json?.data?.payment?.checkout_url;
        const message = String(json?.message ?? '');

        await supabase.rpc('log_webhook_event', {
          p_event: 'join_checkout',
          p_sale_id: null,
          p_email: email,
          p_product: product,
          p_status: String(res.status),
          p_outcome: `step=${step ?? '-'} | tel=${numero} | msg=${message.slice(0, 120)}`,
          p_raw: json ?? {},
        });

        if (res.ok && step === 'payment' && url) {
          let payUrl = url as string;
          try {
            const u = new URL(payUrl);
            if (country) u.searchParams.set('country', country);
            u.searchParams.set('phone', numero);
            payUrl = u.toString();
          } catch {
            /* URL inattendue */
          }
          return NextResponse.json({ url: payUrl });
        }
        if (message) dernierMessage = message;
        // 404 = produit inconnu de cette boutique : clé suivante, inutile
        // d'essayer les autres écritures du numéro.
        if (res.status === 404) break;
      } catch {
        /* réseau : on tente l'écriture / la clé suivante */
      }
    }
  }

  const erreur = /phone|number/i.test(dernierMessage)
    ? 'Ce numéro n’est pas accepté. Vérifie qu’il correspond bien au pays choisi, et saisis-le sans l’indicatif (ex. 97 00 00 00).'
    : 'Le paiement n’a pas pu démarrer. Réessaie dans un instant, ou écris-nous sur WhatsApp au +229 01 57 34 28 14.';
  return NextResponse.json({ error: erreur }, { status: 400 });
}
