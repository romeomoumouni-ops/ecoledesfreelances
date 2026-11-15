// Questionnaire d'accueil « profils entrants » : constantes partagées
// (client, admin, cron) + analyse IA des motivations.

/** Seuls les comptes créés après cette date voient le questionnaire
 *  (lancement le 15 nov. 2026, après le webinaire). */
export const ONBOARDING_SINCE = '2026-11-15T00:00:00Z';

export const SITUATIONS: { key: string; label: string }[] = [
  { key: 'salarie', label: 'Salarié(e)' },
  { key: 'sans_emploi', label: 'Sans emploi' },
  { key: 'petit_job', label: "J'ai un petit job" },
  { key: 'freelance', label: 'Freelance' },
  { key: 'autre', label: 'Autre' },
];

export const SITUATION_LABEL: Record<string, string> = Object.fromEntries(SITUATIONS.map((s) => [s.key, s.label]));

export type OnboardingAnswer = {
  user_id: string;
  motivation: string;
  situation: string;
  situation_autre: string | null;
  created_at: string;
  full_name?: string | null;
  email?: string | null;
};

export function situationText(a: Pick<OnboardingAnswer, 'situation' | 'situation_autre'>): string {
  if (a.situation === 'autre' && a.situation_autre?.trim()) return `Autre : ${a.situation_autre.trim()}`;
  return SITUATION_LABEL[a.situation] ?? a.situation;
}

export function countBySituation(answers: OnboardingAnswer[]): { key: string; label: string; n: number; pct: number }[] {
  const total = answers.length || 1;
  return SITUATIONS.map((s) => {
    const n = answers.filter((a) => a.situation === s.key).length;
    return { ...s, n, pct: Math.round((n / total) * 100) };
  });
}
