import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Ajout d'un accès manuel (hors paiement Chariow) par un admin.
 * Insère l'e-mail dans allowed_emails ET envoie le même e-mail de bienvenue
 * que les acheteurs. Réservé aux admins.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!prof?.is_admin) return NextResponse.json({ error: 'Réservé aux administrateurs.' }, { status: 403 });

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }
  const email = (body.email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Adresse e-mail invalide.' }, { status: 400 });
  }

  // Déjà présent ? (accès manuel existant)
  const { data: existing } = await supabase
    .from('allowed_emails')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, already: true });
  }

  const { error } = await supabase
    .from('allowed_emails')
    .insert({ email, product: 'manuel', source: 'manual' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Même e-mail de bienvenue que les acheteurs (silencieux si non configuré)
  await sendWelcomeEmail(email);

  return NextResponse.json({ ok: true });
}
