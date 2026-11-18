import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendGiftAccessEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/** Renvoie l'e-mail « Créer mon compte » à l'invité qui ne s'est pas encore inscrit. */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const { data, error } = await supabase.rpc('gift_resend_target', { p_secret: process.env.CHARIOW_GRANT_SECRET });
  if (error) return NextResponse.json({ error: 'Impossible de renvoyer l’e-mail. Réessaie.' }, { status: 500 });
  const r = data as { ok: boolean; error?: string; invitee_email?: string; giver_name?: string };
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });

  const sent = await sendGiftAccessEmail(r.invitee_email!, r.giver_name ?? '');
  if (!sent.ok) return NextResponse.json({ error: 'L’e-mail n’a pas pu partir. Réessaie dans quelques minutes.' }, { status: 502 });
  if (sent.id) {
    await supabase.rpc('gift_set_email_id', { p_secret: process.env.CHARIOW_GRANT_SECRET, p_email_id: sent.id });
  }
  return NextResponse.json({ ok: true, invitee_email: r.invitee_email });
}
