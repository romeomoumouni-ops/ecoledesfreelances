import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { sendCartRelanceEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Relance des paniers non finalisés, 20 minutes après l'essai (cf. vercel.json).
 * Chariow ne nous signale QUE les ventes réussies : on détecte l'abandon
 * depuis NOTRE formulaire (pending_checkouts sans paiement correspondant).
 * Une seule relance par personne, jamais pour quelqu'un qui a fini par payer.
 *
 * Sécurité : Bearer CRON_SECRET, ?token=CHARIOW_WEBHOOK_TOKEN, ou super admin.
 * Options : &minutes=N (délai avant relance, 20 min par défaut) · &dry=1 (liste seule).
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const okCron = !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  const okToken =
    !!process.env.CHARIOW_WEBHOOK_TOKEN &&
    req.nextUrl.searchParams.get('token') === process.env.CHARIOW_WEBHOOK_TOKEN;
  let okSuper = false;
  if (!okCron && !okToken) {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const { data: prof } = await sb.from('profiles').select('is_super_admin').eq('id', user.id).maybeSingle();
      okSuper = !!prof?.is_super_admin;
    }
  }
  if (!okCron && !okToken && !okSuper) return NextResponse.json({ ok: false }, { status: 401 });

  const minutes = Math.min(10080, Math.max(5, Number(req.nextUrl.searchParams.get('minutes')) || 20));
  const dry = req.nextUrl.searchParams.get('dry') === '1';

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase.rpc('pending_cart_relances', {
    p_secret: process.env.CHARIOW_GRANT_SECRET,
    p_minutes: minutes,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const list = (data ?? []) as { email: string; prenom: string; plan: string }[];
  if (dry) return NextResponse.json({ ok: true, dry: true, count: list.length, list });

  let sent = 0;
  const failed: { email: string; raison: string }[] = [];
  for (const r of list) {
    const res = await sendCartRelanceEmail(r.email, r.prenom, r.plan);
    if (res.ok) {
      sent++;
      // Marqué seulement si l'envoi a réussi : un échec sera retenté au passage suivant.
      await supabase.rpc('mark_cart_relance', { p_secret: process.env.CHARIOW_GRANT_SECRET, p_email: r.email });
    } else {
      failed.push({ email: r.email, raison: res.error ?? 'inconnu' });
    }
    await new Promise((r) => setTimeout(r, 600)); // limite de débit Resend
  }
  return NextResponse.json({ ok: true, candidats: list.length, envoyes: sent, echecs: failed, delai_minutes: minutes });
}
