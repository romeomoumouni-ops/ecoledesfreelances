import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/user';
import { analyseProfils } from '@/lib/onboarding-ai';
import type { OnboardingAnswer } from '@/lib/onboarding';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Super admin : génère (ou régénère) l'analyse IA des profils entrants sur N jours. */
export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile?.is_super_admin) return NextResponse.json({ error: 'Réservé au super admin.' }, { status: 403 });

  let days = 7;
  try { days = Math.max(1, Math.min(3650, Number((await req.json())?.days) || 7)); } catch { /* défaut */ }
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const supabase = createClient();
  const { data } = await supabase
    .from('onboarding_answers')
    .select('user_id, motivation, situation, situation_autre, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .range(0, 1999);
  const answers = (data ?? []) as OnboardingAnswer[];
  if (!answers.length) return NextResponse.json({ error: 'Aucune réponse sur la période.' }, { status: 400 });

  const label = days >= 3650 ? 'depuis le lancement' : `${days} derniers jours`;
  const body = await analyseProfils(answers, label);
  if (!body) return NextResponse.json({ error: 'IA indisponible (clé manquante ?).' }, { status: 500 });

  const { data: saved, error } = await supabase
    .from('onboarding_analyses')
    .insert({ period_start: since, period_end: new Date().toISOString(), answers_count: answers.length, body })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ analyse: saved });
}
