import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { emailDeliveryStatus, sendGiftAccessEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Places offertes dont l'invité n'a jamais créé son compte.
 * ?token=CHARIOW_WEBHOOK_TOKEN            → liste + statut de livraison du dernier e-mail
 * ?token=CHARIOW_WEBHOOK_TOKEN&send=1     → renvoie l'e-mail « Créer mon compte » à chacun
 * Un statut « bounced » = l'adresse saisie par le donneur n'existe pas.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CHARIOW_WEBHOOK_TOKEN;
  if (!expected || req.nextUrl.searchParams.get('token') !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const send = req.nextUrl.searchParams.get('send') === '1';
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data, error } = await supabase.rpc('gift_pending_invitees', { p_secret: process.env.CHARIOW_GRANT_SECRET });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const list = (data ?? []) as { id: string; invitee_email: string; giver_email: string; giver_name: string; email_id: string | null }[];

  const out: { invitee: string; giver: string; statut: string | null; renvoye?: boolean }[] = [];
  for (const g of list) {
    if (send) {
      const r = await sendGiftAccessEmail(g.invitee_email, g.giver_name);
      if (r.ok && r.id) {
        await supabase.rpc('gift_mark_sent', { p_secret: process.env.CHARIOW_GRANT_SECRET, p_id: g.id, p_email_id: r.id });
      }
      out.push({ invitee: g.invitee_email, giver: g.giver_email, statut: null, renvoye: r.ok });
      await new Promise((res) => setTimeout(res, 600));
    } else {
      out.push({ invitee: g.invitee_email, giver: g.giver_email, statut: g.email_id ? await emailDeliveryStatus(g.email_id) : null });
    }
  }
  return NextResponse.json({ ok: true, count: out.length, list: out });
}
