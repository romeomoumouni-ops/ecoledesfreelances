import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendGiftAccessEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Place offerte (bonus « paiement en une fois ») : l'élève connecté donne
 * l'accès à vie à UNE adresse. Toute la logique (éligibilité, unicité,
 * irrévocabilité) est dans la RPC gift_access ; ici on envoie l'e-mail.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  let email = '';
  try { email = String((await req.json())?.email ?? '').trim().toLowerCase(); } catch { /* vide */ }
  if (!email) return NextResponse.json({ error: 'Entre une adresse e-mail.' }, { status: 400 });

  const { data, error } = await supabase.rpc('gift_access', { p_email: email });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const r = data as { ok: boolean; error?: string; invitee_email?: string; giver_name?: string };
  if (!r.ok) return NextResponse.json({ error: r.error ?? 'Impossible d’offrir la place.' }, { status: 400 });

  const sent = await sendGiftAccessEmail(r.invitee_email!, r.giver_name ?? '');
  return NextResponse.json({ ok: true, invitee_email: r.invitee_email, email_sent: sent });
}
