import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyseProfils } from '@/lib/onboarding-ai';
import { countBySituation, type OnboardingAnswer } from '@/lib/onboarding';
import { sendProfilsReport } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Chaque mardi 07:00 UTC : rapport des profils entrants des 7 derniers jours
 * (motivations, situations, analyse IA) envoyé au super admin. `?days=` et
 * `&dry=1` pour tester.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const isVercelCron = !!cronSecret && auth === `Bearer ${cronSecret}`;
  const manual = !!process.env.CHARIOW_GRANT_SECRET && url.searchParams.get('key') === process.env.CHARIOW_GRANT_SECRET;
  if (!isVercelCron && !manual) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const days = Math.max(1, Math.min(90, Number(url.searchParams.get('days')) || 7));
  const dry = url.searchParams.get('dry') === '1';
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const secret = process.env.CHARIOW_GRANT_SECRET;

  const supabase = createClient();
  const { data: raw, error } = await supabase.rpc('onboarding_report', { p_secret: secret, p_since: since });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const answers = (raw ?? []) as OnboardingAnswer[];

  const { data: patron } = await supabase.rpc('super_admin_email', { p_secret: secret });
  if (typeof patron !== 'string' || !patron) return NextResponse.json({ error: 'super admin introuvable' }, { status: 500 });

  const analyse = answers.length ? await analyseProfils(answers, `${days} derniers jours`) : null;
  if (analyse && !dry) {
    await supabase.rpc('store_onboarding_analysis', {
      p_secret: secret,
      p_start: since,
      p_end: new Date().toISOString(),
      p_count: answers.length,
      p_body: analyse,
    });
  }

  const sent = dry ? false : await sendProfilsReport(patron, { days, answers, repartition: countBySituation(answers), analyse });
  return NextResponse.json({ ok: true, days, reponses: answers.length, analyse: !!analyse, email_envoye: sent, dry });
}
