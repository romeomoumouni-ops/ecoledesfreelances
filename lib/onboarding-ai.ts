// Analyse IA des profils entrants — côté serveur uniquement (SDK Anthropic).
import Anthropic from '@anthropic-ai/sdk';
import { situationText, type OnboardingAnswer } from '@/lib/onboarding';

/**
 * Analyse IA des réponses : grandes motivations (avec parts approximatives),
 * profils dominants, ce que ça dit pour le discours de vente et l'accompagnement.
 * Texte en français, prêt à lire. Renvoie null si pas de clé ou pas de réponses.
 */
export async function analyseProfils(answers: OnboardingAnswer[], periodLabel: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !answers.length) return null;
  const corpus = answers
    .slice(0, 400)
    .map((a, i) => `${i + 1}. [${situationText(a)}] ${a.motivation.replace(/\s+/g, ' ').trim()}`)
    .join('\n');
  const client = new Anthropic({ apiKey: key });
  const res = await client.messages.create({
    model: process.env.ONBOARDING_AI_MODEL || process.env.COACH_AUTOPILOT_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    temperature: 0.3,
    system:
      "Tu es l'analyste marketing de L'École des Freelances (formation pour devenir freelance IA, Afrique francophone). " +
      "On te donne les réponses des nouveaux élèves à deux questions : la raison principale qui les a poussés à rejoindre, et leur situation actuelle. " +
      "Rédige une analyse courte et actionnable en français, sans titre markdown (#), en 4 parties séparées par une ligne vide, chacune commençant par une étiquette en majuscules suivie de deux-points : " +
      "MOTIVATIONS (les 3 à 5 grandes raisons, avec une part approximative en % et une citation courte représentative chacune), " +
      "PROFILS (qui sont ces personnes, croisement situation × motivation), " +
      "SIGNAUX (ce qui ressort d'inattendu, objections ou attentes à surveiller), " +
      "À FAIRE (3 recommandations concrètes pour le discours de vente, l'onboarding ou l'accompagnement). " +
      "Reste factuel, n'invente pas de chiffres au-delà de ce que les réponses permettent, et ne cite jamais de nom ni d'e-mail. Zéro astérisque.",
    messages: [{ role: 'user', content: `Période : ${periodLabel}. ${answers.length} réponse(s).\n\n${corpus}` }],
  });
  const text = res.content
    .map((c) => (c.type === 'text' ? c.text : ''))
    .join('\n')
    .trim();
  return text || null;
}
