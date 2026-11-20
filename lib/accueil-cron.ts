import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { sendAccueilLundiEmail, sendSuiviAchatEmail } from '@/lib/email';

type Person = { email: string; prenom: string; has_account: boolean; last_sign_in: string | null };

/** Autorisation commune : cron Vercel, ?token=CHARIOW_WEBHOOK_TOKEN, ou super admin connecté. */
async function autorise(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (process.env.CHARIOW_WEBHOOK_TOKEN && req.nextUrl.searchParams.get('token') === process.env.CHARIOW_WEBHOOK_TOKEN) return true;
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const { data: prof } = await sb.from('profiles').select('is_super_admin').eq('id', user.id).maybeSingle();
  return !!prof?.is_super_admin;
}

/**
 * Envoi d'une étape de la séquence d'accueil.
 * Options : &dry=1 (liste sans envoyer) · &test=email (les versions de l'e-mail à cette adresse seulement)
 */
export async function runAccueil(req: NextRequest, kind: 'suivi' | 'lundi') {
  if (!(await autorise(req))) return NextResponse.json({ ok: false }, { status: 401 });
  const dry = req.nextUrl.searchParams.get('dry') === '1';
  const test = (req.nextUrl.searchParams.get('test') ?? '').trim().toLowerCase();

  if (test) {
    const r =
      kind === 'suivi'
        ? [await sendSuiviAchatEmail(test, 'Test', true), await sendSuiviAchatEmail(test, 'Test', false)]
        : [await sendAccueilLundiEmail(test, 'Test', true), await sendAccueilLundiEmail(test, 'Test', false)];
    return NextResponse.json({ ok: r.every((x) => x.ok), test, resultats: r.map((x) => x.error ?? 'envoyé') });
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data, error } = await supabase.rpc('onboarding_people', {
    p_secret: process.env.CHARIOW_GRANT_SECRET,
    p_kind: kind,
    p_minutes: 5,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const list = (data ?? []) as Person[];
  if (dry) {
    return NextResponse.json({
      ok: true, dry: true, count: list.length,
      sans_compte: list.filter((p) => !p.has_account).length,
    });
  }

  let sent = 0;
  const failed: string[] = [];
  let firstError: string | undefined;
  for (const p of list) {
    const connecte = p.has_account && !!p.last_sign_in;
    const r =
      kind === 'suivi'
        ? await sendSuiviAchatEmail(p.email, p.prenom ?? '', connecte)
        : await sendAccueilLundiEmail(p.email, p.prenom ?? '', p.has_account);
    if (r.ok) {
      sent++;
      await supabase.rpc('onboarding_mark', { p_secret: process.env.CHARIOW_GRANT_SECRET, p_email: p.email, p_kind: kind });
    } else {
      failed.push(p.email);
      firstError ??= r.error;
      // Quota ou panne du service d'e-mail : inutile d'insister, on retentera au prochain passage.
      if (/^429|^5\d\d/.test(r.error ?? '')) break;
    }
    await new Promise((res) => setTimeout(res, 550));
  }
  return NextResponse.json({ ok: true, kind, count: list.length, sent, failed: failed.length, error: firstError });
}
