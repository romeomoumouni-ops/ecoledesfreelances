// Pilote automatique des coachs : l'IA répond aux élèves à la place d'un coach,
// en s'appuyant sur la « Boîte de data » que ce coach a remplie.

import Anthropic from '@anthropic-ai/sdk';
import { contactByKey } from '@/lib/coaches';

// Modèle économique par défaut (le fondateur veut des réponses peu coûteuses).
export function autopilotModel(): string {
  return process.env.COACH_AUTOPILOT_MODEL || 'claude-haiku-4-5-20251001';
}

// Plafond de data injectée dans le prompt (caractères). Au-delà, on coupe les
// documents les plus anciens : la data récente est prioritaire.
const MAX_KNOWLEDGE_CHARS = 60_000;

export type AutopilotContext = {
  recipient: string;
  student_id: string;
  student_name: string | null;
  history: { from_admin: boolean; body: string }[];
  knowledge: { title: string; content: string }[];
};

function buildKnowledge(items: { title: string; content: string }[]): string {
  const parts: string[] = [];
  let used = 0;
  // Les plus récents d'abord (la liste arrive du plus ancien au plus récent)
  for (const k of [...items].reverse()) {
    const block = `### ${k.title}\n${k.content.trim()}`;
    if (used + block.length > MAX_KNOWLEDGE_CHARS) {
      const reste = MAX_KNOWLEDGE_CHARS - used;
      if (reste > 500) parts.push(block.slice(0, reste) + '\n[…]');
      break;
    }
    parts.push(block);
    used += block.length;
  }
  return parts.join('\n\n');
}

function systemPrompt(coachName: string, coachRole: string, knowledge: string): string {
  const base = `Tu es ${coachName}, ${coachRole} à L'École des Freelances — un programme d'accompagnement qui forme des freelances (surtout en Afrique francophone) à vivre de leurs compétences grâce à l'IA et à des plateformes comme ComeUp.
Tu réponds aux messages que les élèves t'envoient dans la messagerie de la plateforme.

Règles :
- Réponds en français, en tutoyant l'élève, avec chaleur et simplicité — comme un coach qui connaît bien ses élèves.
- Sois concret et utile : va droit au but, donne des étapes ou des conseils applicables. 3 à 8 phrases en général ; plus long seulement si la question le demande.
- Pas de titres, pas de listes à puces lourdes, pas d'astérisques : un message naturel, comme écrit à la main dans une messagerie.
- Ne signe pas, ne dis pas bonjour à chaque message si la conversation est déjà engagée.
- N'invente JAMAIS de date de live, de lien, de prix, de promesse ou de procédure précise que tu ne connais pas. Si l'information manque, dis-le simplement et indique que tu reviendras vers l'élève avec la réponse exacte (ou oriente-le vers le bon endroit de la plateforme : cours, replays dans « Live & Replay », Communauté, Suivi hebdomadaire).
- Si l'élève parle d'un problème de paiement ou d'accès, rassure-le et dis-lui que l'équipe traite sa demande rapidement ; ne promets aucun remboursement ni geste commercial.
- Ne révèle pas que tu es une IA sauf si on te le demande directement ; dans ce cas, réponds honnêtement que c'est l'assistant du coach qui répond en son nom et que le coach peut prendre le relais.`;

  if (!knowledge.trim()) {
    return `${base}

Tu n'as pas encore de documentation spécifique de ce coach : réponds avec des conseils généraux de bon sens sur le freelancing, la prospection, l'organisation et l'utilisation de la plateforme, et propose de faire remonter les questions précises au coach.`;
  }
  return `${base}

Voici la documentation que ${coachName} t'a confiée. Appuie-toi dessus en priorité (façon de répondre, réponses aux questions fréquentes, règles du programme). Si une question sort de cette documentation, réponds avec prudence et propose que le coach précise.

--- DOCUMENTATION DU COACH ---
${knowledge}
--- FIN DE LA DOCUMENTATION ---`;
}

/** Génère la réponse du coach (IA) au dernier message de l'élève. */
export async function generateCoachReply(ctx: AutopilotContext): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const coach = contactByKey(ctx.recipient);
  const coachName = coach?.name ?? 'Coach';
  const coachRole = coach?.role ?? 'coach';

  const knowledge = buildKnowledge(ctx.knowledge);
  const system = systemPrompt(coachName, coachRole, knowledge);

  // Historique du fil → tours de conversation (élève = user, coach = assistant)
  const messages: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const m of ctx.history) {
    const role = m.from_admin ? 'assistant' : 'user';
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content += `\n\n${m.body}`; // fusion des tours consécutifs
    else messages.push({ role, content: m.body });
  }
  if (!messages.length || messages[messages.length - 1].role !== 'user') return null;
  if (messages[0].role === 'assistant') messages.shift(); // l'API exige de commencer par l'élève

  const client = new Anthropic({ apiKey: key });
  const res = await client.messages.create({
    model: autopilotModel(),
    max_tokens: 700,
    temperature: 0.4,
    // La documentation est mise en cache : les questions suivantes du même
    // coach coûtent une fraction du prix.
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages,
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  return text || null;
}
