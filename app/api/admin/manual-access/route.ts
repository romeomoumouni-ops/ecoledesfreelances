import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Ajout d'un accès manuel (hors paiement Chariow) par un admin, AVEC un plan
 * (1x / 3x / 6x). Crée un access_grants : 1x = à vie ; 3x/6x = 30 jours puis
 * expiration (comme Chariow). Envoie le même e-mail de bienvenue que les
 * acheteurs. Réservé aux admins.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!prof?.is_admin) return NextResponse.json({ error: 'Réservé aux administrateurs.' }, { status: 403 });

  let body: { email?: string; plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }
  const email = (body.email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Adresse e-mail invalide.' }, { status: 400 });
  }
  const plan = body.plan === '3x' || body.plan === '6x' ? body.plan : '1x';

  const { data, error } = await supabase.rpc('admin_manual_grant', { p_email: email, p_plan: plan });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if ((data as { status?: string } | null)?.status === 'already') {
    return NextResponse.json({ ok: true, already: true });
  }

  // Nouvel accès : e-mail de bienvenue (silencieux si non configuré)
  await sendWelcomeEmail(email);
  return NextResponse.json({ ok: true, plan });
}
