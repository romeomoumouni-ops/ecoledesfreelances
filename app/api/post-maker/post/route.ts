import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { claudeStreamResponse, hasClaudeKey } from '@/lib/post-maker-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM = `Tu es un expert en création de contenu et copywriting pour les réseaux sociaux,
spécialisé pour les freelances et entrepreneurs francophones. Tu écris des posts qui
accrochent dès la première ligne, apportent de la valeur et donnent envie d'agir.

Règles de rédaction :
- Écris en français, ton naturel et humain (jamais robotique).
- Commence par un HOOK fort (1re ligne qui arrête le scroll).
- Aère le texte : phrases courtes, sauts de ligne, éventuellement des puces.
- Apporte une vraie valeur ou une histoire, pas du blabla.
- Termine par un appel à l'action ou une question pour l'engagement.
- Ajoute quelques hashtags pertinents à la fin (3 à 6 max), seulement si utile.
- Respecte STRICTEMENT le type de post, le ton et les mots-clés demandés.
- Rends UNIQUEMENT le post final, prêt à publier. Pas de préambule, pas d'explication.`;

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const { data: access } = await supabase.rpc('my_post_maker_access');
  if ((access as { active?: boolean } | null)?.active !== true) {
    return NextResponse.json({ error: 'Abonnement AI Post Maker requis.' }, { status: 403 });
  }
  if (!hasClaudeKey()) {
    return NextResponse.json({ error: "L'IA n'est pas encore configurée. Contacte l'équipe." }, { status: 503 });
  }

  let body: {
    platform?: string; type?: string; tone?: string; niche?: string;
    keywords?: string; subject?: string; length?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const subject = (body.subject ?? '').trim().slice(0, 1500);
  if (!subject) return NextResponse.json({ error: 'Décris le sujet de ton post.' }, { status: 400 });

  const brief = [
    body.platform ? `Plateforme : ${body.platform}` : null,
    body.type ? `Type de post : ${body.type}` : null,
    body.tone ? `Ton : ${body.tone}` : null,
    body.niche ? `Niche / thématique : ${body.niche}` : null,
    body.keywords ? `Mots-clés à intégrer : ${body.keywords}` : null,
    body.length ? `Longueur souhaitée : ${body.length}` : null,
    `Sujet / idée du post :\n${subject}`,
  ].filter(Boolean).join('\n');

  return claudeStreamResponse({
    system: SYSTEM,
    messages: [{ role: 'user', content: `Rédige un post à partir de ce brief :\n\n${brief}` }],
    maxTokens: 1400,
    onFinal: async (u) => {
      await supabase.from('post_maker_usage').insert({
        user_id: user.id, kind: 'post',
        input_tokens: u.inputTokens, output_tokens: u.outputTokens, cost_usd: u.costUsd,
      });
    },
  });
}
