import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendGiftAccessEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Place offerte, étape 2 : l'élève saisit le code reçu par son invité. La RPC
 * gift_access vérifie le code et donne l'accès à vie ; ici on envoie l'e-mail
 * « Créer mon compte » à l'invité.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  let email = '';
  let code = '';
  try {
    const b = await req.json();
    email = String(b?.email ?? '').trim().toLowerCase();
    code = String(b?.code ?? '').replace(/\D/g, '');
  } catch { /* vide */ }
  if (!email) return NextResponse.json({ error: 'Entre une adresse e-mail.' }, { status: 400 });
  if (code.length !== 6) return NextResponse.json({ error: 'Le code contient 6 chiffres.' }, { status: 400 });

  const { data, error } = await supabase.rpc('gift_access', { p_email: email, p_code: code });
  if (error) return NextResponse.json({ error: 'Impossible d’offrir la place. Réessaie.' }, { status: 500 });
  const r = data as { ok: boolean; error?: string; invitee_email?: string; giver_name?: string };
  if (!r.ok) return NextResponse.json({ error: r.error ?? 'Impossible d’offrir la place.' }, { status: 400 });

  const sent = await sendGiftAccessEmail(r.invitee_email!, r.giver_name ?? '');
  if (sent.id) {
    await supabase.rpc('gift_set_email_id', { p_secret: process.env.CHARIOW_GRANT_SECRET, p_email_id: sent.id });
  }
  return NextResponse.json({ ok: true, invitee_email: r.invitee_email, email_sent: sent.ok });
}
