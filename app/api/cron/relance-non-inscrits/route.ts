import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { sendAccessReminderEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Relance hebdomadaire (LUNDI 15 h heure du Bénin, cf. vercel.json) des personnes qui
 * ont PAYÉ mais n'ont JAMAIS créé leur compte : leur accès est actif, elles ne
 * le savent pas ou n'ont pas vu l'e-mail de bienvenue.
 *
 * - la liste est recalculée AU MOMENT de l'envoi (personne inscrite entre-temps
 *   n'est pas relancée pour rien) ;
 * - une seule relance par personne (reminder_sent_at) ;
 * - fenêtre de 30 jours par défaut : les 1869 achats importés en masse le
 *   03/07/2026 (reprise d'historique) ne sont jamais relancés automatiquement.
 *
 * Sécurité : header du cron Vercel (Bearer CRON_SECRET), ou
 * ?token=CHARIOW_WEBHOOK_TOKEN, ou une session super admin connectée.
 * Options : &days=N (fenêtre) · &dry=1 (liste sans envoyer)
 *           &test=email (exemplaire à cette adresse seulement)
 *           &at=ISO8601 (livraison différée confiée à Resend).
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const okCron = !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  const okToken =
    !!process.env.CHARIOW_WEBHOOK_TOKEN &&
    req.nextUrl.searchParams.get('token') === process.env.CHARIOW_WEBHOOK_TOKEN;
  // Sinon : super admin connecté (pour tester depuis l'espace admin)
  let okSuper = false;
  if (!okCron && !okToken) {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const { data: prof } = await sb
        .from('profiles').select('is_super_admin').eq('id', user.id).maybeSingle();
      okSuper = !!prof?.is_super_admin;
    }
  }
  if (!okCron && !okToken && !okSuper) return NextResponse.json({ ok: false }, { status: 401 });

  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30));
  const dry = req.nextUrl.searchParams.get('dry') === '1';
  const test = (req.nextUrl.searchParams.get('test') ?? '').trim().toLowerCase();
  // Livraison différée (ex. préparer maintenant, arriver à 9 h) — Resend garde
  // l'e-mail en file et le délivre à l'heure demandée.
  const at = (req.nextUrl.searchParams.get('at') ?? '').trim() || undefined;

  // Test : un exemplaire de l'e-mail à une adresse choisie, rien d'autre.
  if (test) {
    const ok = await sendAccessReminderEmail(test, 'Test', at);
    return NextResponse.json({ ok, test, envoye: ok });
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase.rpc('pending_access_reminders', {
    p_secret: process.env.CHARIOW_GRANT_SECRET,
    p_days: days,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const list = (data ?? []) as { email: string; nom: string | null; plan: string }[];
  if (dry) return NextResponse.json({ ok: true, dry: true, count: list.length, list });

  let sent = 0;
  const failed: string[] = [];
  for (const r of list) {
    const ok = await sendAccessReminderEmail(r.email, r.nom, at);
    if (ok) {
      sent++;
      // Marqué seulement si l'envoi a réussi : un échec sera retenté demain.
      await supabase.rpc('mark_access_reminder', {
        p_secret: process.env.CHARIOW_GRANT_SECRET,
        p_email: r.email,
      });
    } else {
      failed.push(r.email);
    }
    await new Promise((r) => setTimeout(r, 600)); // limite de débit Resend (2/s)
  }

  return NextResponse.json({
    ok: true, candidats: list.length, envoyes: sent, echecs: failed,
    ...(at ? { livraison_prevue: at } : {}),
  });
}
