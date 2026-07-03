import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Super Coach Roméo — moteur hybride.
 *
 * MODE GRATUIT (par défaut, aucun coût, scalable à l'infini) :
 * répond depuis les données fournies par les admins — FAQ (réponses exactes)
 * puis extraits du « cerveau » (coach_knowledge, recherche plein texte
 * française dans Postgres). Question trop complexe -> redirection vers le
 * suivi hebdomadaire / les coachs.
 *
 * MODE IA COMPLET (optionnel) : si ANTHROPIC_API_KEY est configurée sur
 * Vercel, bascule automatiquement sur Claude (réponses génératives).
 */

const HISTORY_TURNS = 12;

function hasClaudeKey(): boolean {
  const k = process.env.ANTHROPIC_API_KEY;
  return !!k && !k.startsWith('a-remplir');
}

/* ------------------------- Mode gratuit (local) ------------------------- */

const FALLBACK =
  "Bonne question — mais elle mérite une **réponse personnalisée d'un humain** ! 👇\n\n" +
  "• Écris à ton chargé de suivi dans l'onglet **Suivi hebdomadaire** (réponse sous 3 à 5 jours)\n" +
  '• Ou passe par **Contacter les coachs** dans le menu\n\n' +
  'Tu peux aussi reformuler avec des mots-clés plus précis (ex. « prospection », « Comeup », « portfolio ») : je fouille dans les méthodes de Roméo.';

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function smalltalk(message: string, firstName: string): string | null {
  const m = normalize(message);
  if (/^(bonjour|bonsoir|salut|slt|hello|hi|coucou|cc|yo|bjr)\b/.test(m) && m.length < 30) {
    return `Salut ${firstName} 👋 Content de te voir ! Pose-moi ta question sur le freelancing ou le programme : prospection, Comeup, cours à suivre, objectif… je réponds tout de suite.`;
  }
  if (/^(merci|thanks|top|super|parfait|ok merci|d accord|daccord)\b/.test(m) && m.length < 30) {
    return `Avec plaisir 💪 Fonce, et reviens quand tu veux. **L'action bat la perfection** — c'est comme ça qu'on réussit dans le programme.`;
  }
  if (/^(ok|ca va|ça va|oui|non|d accord)\s*[!?.]*$/.test(m)) {
    return `Parfait ! Si tu as une question sur les cours, la prospection ou ton objectif, je suis là.`;
  }
  return null;
}

async function localAnswer(
  supabase: ReturnType<typeof createClient>,
  message: string,
  firstName: string
): Promise<string> {
  const small = smalltalk(message, firstName);
  if (small) return small;

  const [{ data: faq }, { data: knowledge }] = await Promise.all([
    supabase.rpc('search_coach_faq', { p_query: message }),
    supabase.rpc('search_coach_knowledge', { p_query: message }),
  ]);

  // 1) Réponse exacte de la FAQ si la correspondance est bonne
  const f = faq as { question: string; answer: string; rank: number } | null;
  if (f && f.rank >= 0.05) return f.answer;

  // 2) Extraits du cerveau de Roméo
  const ks = (knowledge ?? []) as { title: string; content: string }[];
  if (Array.isArray(ks) && ks.length) {
    const parts = ks.slice(0, 2).map((k) => {
      const text = k.content.length > 1200 ? k.content.slice(0, 1200).trimEnd() + '…' : k.content;
      return `**${k.title}**\n${text}`;
    });
    return (
      `Voici ce que Roméo enseigne là-dessus 👇\n\n${parts.join('\n\n')}\n\n` +
      `Si tu veux aller plus loin, regarde les cours dans **Mes cours à suivre** ou pose une question plus précise.`
    );
  }

  // 3) FAQ faible mais existante ? On la propose quand même.
  if (f) return `${f.answer}\n\n_Si ce n'était pas ta question : ${FALLBACK}_`;

  // 4) Trop complexe / hors base -> humain
  return FALLBACK;
}

/* ----------------------- Mode IA complet (Claude) ----------------------- */

const PERSONA = `Tu es « Super Coach Roméo », l'assistant IA officiel de L'École des Freelances,
entraîné sur les connaissances de Roméo Moumouni, fondateur de l'école.

Ton rôle : aider les élèves à réussir leur parcours de freelance (mindset, prospection,
Comeup, copywriting IA, création d'affiches et vidéos IA, montage vidéo, acquisition de
clients, organisation) et répondre à leurs questions sur le programme.

Ton style : celui de Roméo — direct, motivant, concret, tutoiement, phrases courtes,
exemples pratiques, zéro blabla. Tu pousses à l'action. Tu peux utiliser le gras
(**texte**) pour les points clés.

Règles :
- Réponds en français.
- Appuie-toi d'abord sur les CONNAISSANCES fournies quand elles sont pertinentes.
- Questions personnelles (paiement, accès, suivi individuel) -> onglet « Suivi
  hebdomadaire » ou « Contacter les coachs ».
- Sois honnête quand tu ne sais pas. N'invente jamais de chiffres sur l'école.`;

async function platformContext(supabase: ReturnType<typeof createClient>): Promise<string> {
  const [{ data: courses }, { data: modules }, { data: chapters }] = await Promise.all([
    supabase.from('courses').select('id, title, description').order('sort'),
    supabase.from('modules').select('course_id, title').order('position'),
    supabase.from('chapters').select('course_id, title').order('position'),
  ]);
  const lines: string[] = ['CATALOGUE ACTUEL DES COURS DU PROGRAMME :'];
  for (const c of courses ?? []) {
    lines.push(`\n• Cours : ${c.title}${c.description ? ` — ${String(c.description).slice(0, 200)}` : ''}`);
    const mods = (modules ?? []).filter((m) => m.course_id === c.id).map((m) => m.title);
    if (mods.length) lines.push(`  Modules : ${mods.join(' · ')}`);
    const chs = (chapters ?? []).filter((ch) => ch.course_id === c.id).map((ch) => ch.title);
    if (chs.length) lines.push(`  Chapitres : ${chs.slice(0, 30).join(' · ')}`);
  }
  lines.push(
    "\nFONCTIONNEMENT DE LA PLATEFORME : « Mes cours à suivre » (vidéos, quiz, commentaires), " +
      '« Live » (coachings de groupe), « Objectif » (100 points de tâches), ' +
      '« Suivi hebdomadaire » (messagerie privée, réponse sous 3 à 5 jours), ' +
      '« Résultats et témoignages », « Communauté », « Contacter les coachs » ' +
      '(Coach Christian, Coach Tobby, Coach Mohamed, Mariane).'
  );
  return lines.join('\n');
}

/* --------------------------------- Route -------------------------------- */

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const { data: access } = await supabase.rpc('get_my_access');
  if ((access as { active?: boolean } | null)?.active !== true) {
    return NextResponse.json({ error: 'Accès inactif.' }, { status: 403 });
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }
  const message = (body.message ?? '').trim().slice(0, 2000);
  if (!message) return NextResponse.json({ error: 'Message vide.' }, { status: 400 });

  const claude = hasClaudeKey();
  const dailyLimit = claude ? 30 : 100; // mode gratuit : limite anti-spam seulement

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('super_coach_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('role', 'user')
    .gte('created_at', today.toISOString());
  if ((count ?? 0) >= dailyLimit) {
    return NextResponse.json(
      { error: `Tu as atteint la limite de ${dailyLimit} messages par jour. Reviens demain, ou écris à ton chargé de suivi.` },
      { status: 429 }
    );
  }

  const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const firstName = (prof?.full_name || 'champion').split(' ')[0];

  await supabase.from('super_coach_messages').insert({ user_id: user.id, role: 'user', content: message });

  /* ---- Mode gratuit ---- */
  if (!claude) {
    const answer = await localAnswer(supabase, message, firstName);
    await supabase.from('super_coach_messages').insert({ user_id: user.id, role: 'assistant', content: answer });
    return new Response(answer, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  /* ---- Mode IA complet (Claude) ---- */
  const [{ data: history }, { data: knowledge }, catalog] = await Promise.all([
    supabase
      .from('super_coach_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(HISTORY_TURNS),
    supabase.rpc('search_coach_knowledge', { p_query: message }),
    platformContext(supabase),
  ]);

  const knowledgeText = Array.isArray(knowledge) && knowledge.length
    ? 'CONNAISSANCES DE ROMÉO (extraits pertinents) :\n\n' +
      (knowledge as { title: string; content: string }[])
        .map((k) => `— ${k.title} —\n${k.content}`)
        .join('\n\n')
    : '';

  const past = (history ?? []).reverse();
  const messages: Anthropic.MessageParam[] = [
    ...past.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ];

  const anthropic = new Anthropic();
  const encoder = new TextEncoder();
  let full = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = anthropic.messages.stream({
          model: process.env.SUPER_COACH_MODEL || 'claude-opus-4-8',
          max_tokens: 1500,
          system: [
            { type: 'text', text: PERSONA, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: catalog + (knowledgeText ? `\n\n${knowledgeText}` : '') },
          ],
          messages,
        });
        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await claudeStream.finalMessage();
        if (final.stop_reason === 'refusal' && !full) {
          const msg = 'Je ne peux pas répondre à cette question. Pose-moi une question sur le freelancing ou le programme !';
          full = msg;
          controller.enqueue(encoder.encode(msg));
        }
      } catch {
        const msg = full
          ? '\n\n[Connexion interrompue — repose ta question.]'
          : 'Le Super Coach est momentanément indisponible. Réessaie dans quelques instants.';
        full += msg;
        controller.enqueue(encoder.encode(msg));
      } finally {
        if (full.trim()) {
          await supabase
            .from('super_coach_messages')
            .insert({ user_id: user.id, role: 'assistant', content: full.trim() });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
