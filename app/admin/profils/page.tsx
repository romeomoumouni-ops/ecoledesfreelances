import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/user';
import type { OnboardingAnswer } from '@/lib/onboarding';
import ProfilsClient, { type Analyse } from './ProfilsClient';

export const dynamic = 'force-dynamic';

/** Onglet super admin : qui rejoint l'école (motivation + situation), en temps réel, avec analyse IA. */
export default async function ProfilsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');
  if (!profile.is_super_admin) redirect('/admin');

  const supabase = createClient();
  const [{ data: rows }, { data: analyses }] = await Promise.all([
    supabase
      .from('onboarding_answers')
      .select('user_id, motivation, situation, situation_autre, created_at')
      .order('created_at', { ascending: false })
      .range(0, 1999),
    supabase.from('onboarding_analyses').select('*').order('created_at', { ascending: false }).limit(1),
  ]);
  const answers = (rows ?? []) as OnboardingAnswer[];

  // Nom + e-mail des répondants (profiles lisibles par l'admin)
  const ids = answers.map((a) => a.user_id);
  const people = new Map<string, { full_name: string | null; email: string | null }>();
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await supabase.from('profiles').select('id, full_name, email').in('id', ids.slice(i, i + 500));
    for (const p of data ?? []) people.set(p.id, { full_name: p.full_name, email: p.email });
  }
  for (const a of answers) {
    const p = people.get(a.user_id);
    a.full_name = p?.full_name ?? null;
    a.email = p?.email ?? null;
  }

  return <ProfilsClient initial={answers} analyse={((analyses ?? [])[0] as Analyse | undefined) ?? null} />;
}
