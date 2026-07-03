import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Messages élève max par jour (protège le coût de l'API)
const DAILY_LIMIT = 30;
// Tours d'historique renvoyés au modèle
const HISTORY_TURNS = 12;

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
- Appuie-toi d'abord sur les CONNAISSANCES fournies ci-dessous quand elles sont pertinentes ;
  sinon, réponds avec les meilleures pratiques du freelancing en Afrique francophone.
- Si on te demande un avis médical, juridique, ou un sujet hors freelancing/programme,
  redirige poliment vers le cadre du programme.
- Pour les questions personnelles (paiement, accès, suivi individuel), oriente vers
  l'onglet « Suivi hebdomadaire » ou « Contacter les coachs ».
- Rappelle si utile : le suivi hebdomadaire répond sous 3 à 5 jours ; toi tu réponds
  immédiatement, mais tu es une IA — pour un humain, il y a les coachs.
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
    "\nFONCTIONNEMENT DE LA PLATEFORME : onglets « Mes cours à suivre » (vidéos, quiz, commentaires), " +
      '« Live » (coachings de groupe), « Objectif » (100 points de tâches à accomplir honnêtement), ' +
      '« Suivi hebdomadaire » (messagerie privée avec un chargé de suivi, réponse sous 3 à 5 jours si le message est pertinent), ' +
      '« Résultats et témoignages » (publier ses chiffres), « Communauté » (Annonces, Publications des membres, Vos victoires du jour), ' +
      '« Contacter les coachs » (Coach Christian, Coach Tobby, Coach Mohamed, Mariane).'
  );
  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith('a-remplir')) {
    return NextResponse.json(
      { error: "Le Super Coach n'est pas encore activé (clé API manquante)." },
      { status: 503 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  // Garde-fou paiement : mêmes règles que le reste de l'app
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

  // Limite quotidienne
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('super_coach_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('role', 'user')
    .gte('created_at', today.toISOString());
  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `Tu as atteint la limite de ${DAILY_LIMIT} messages par jour. Reviens demain, ou écris à ton chargé de suivi.` },
      { status: 429 }
    );
  }

  // Historique récent + connaissances pertinentes + catalogue
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
    ? 'CONNAISSANCES DE ROMÉO (extraits pertinents pour cette question) :\n\n' +
      (knowledge as { title: string; content: string }[])
        .map((k) => `— ${k.title} —\n${k.content}`)
        .join('\n\n')
    : '';

  // Enregistre le message élève AVANT l'appel (compte pour la limite)
  await supabase.from('super_coach_messages').insert({ user_id: user.id, role: 'user', content: message });

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
