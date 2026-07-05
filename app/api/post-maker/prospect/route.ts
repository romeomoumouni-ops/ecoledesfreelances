import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { claudeStreamResponse, hasClaudeKey } from '@/lib/post-maker-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM = `Tu es un expert de la prospection et du closing pour freelances francophones.
Tu aides l'utilisateur (un freelance) à décrocher des clients : tu rédiges pour LUI les
messages à ENVOYER au prospect.

Principes :
- Écris en français, ton humain, personnalisé, jamais "copié-collé".
- Personnalise selon le profil / l'industrie du prospect fourni.
- Messages d'approche : courts, accrocheurs, centrés sur le bénéfice pour le prospect,
  jamais mendiants, avec un appel à l'action léger (ouvrir la conversation).
- En cours de discussion : réponds aux objections, crée de la valeur, fais avancer
  vers la vente (proposer un appel, un devis, closer) sans être insistant ni désespéré.
- Rends UNIQUEMENT le message à envoyer, prêt à copier. Pas de commentaire, pas de guillemets,
  pas d'explication autour. Si un choix est nécessaire, propose une seule meilleure version.`;

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
    mode?: 'opener' | 'reply';
    prospect?: string; service?: string; tone?: string;
    conversation?: { from: 'prospect' | 'me'; text: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const mode = body.mode === 'reply' ? 'reply' : 'opener';
  const prospect = (body.prospect ?? '').trim().slice(0, 2000);
  const service = (body.service ?? '').trim().slice(0, 500);
  const tone = (body.tone ?? '').trim().slice(0, 120);

  const context = [
    prospect ? `PROFIL DU PROSPECT (lien, nom, industrie, infos) :\n${prospect}` : null,
    service ? `CE QUE JE PROPOSE (mon service de freelance) : ${service}` : null,
    tone ? `TON SOUHAITÉ : ${tone}` : null,
  ].filter(Boolean).join('\n\n');

  const messages: Anthropic.MessageParam[] = [];
  const kind = mode === 'reply' ? 'prospect_reply' : 'prospect_opener';

  if (mode === 'opener') {
    if (!prospect) return NextResponse.json({ error: 'Donne au moins le profil / l’industrie du prospect.' }, { status: 400 });
    messages.push({
      role: 'user',
      content: `${context}\n\nRédige le PREMIER message d'approche à envoyer à ce prospect pour ouvrir la conversation.`,
    });
  } else {
    const conv = Array.isArray(body.conversation) ? body.conversation.slice(-20) : [];
    if (conv.length === 0) return NextResponse.json({ error: 'Aucun échange fourni.' }, { status: 400 });
    const transcript = conv
      .map((m) => `${m.from === 'prospect' ? 'PROSPECT' : 'MOI'} : ${String(m.text).slice(0, 1500)}`)
      .join('\n');
    messages.push({
      role: 'user',
      content:
        `${context}\n\nVoici l'échange en cours avec le prospect :\n\n${transcript}\n\n` +
        `Rédige le prochain message que MOI (le freelance) je dois lui envoyer pour faire avancer la discussion et me rapprocher de la vente.`,
    });
  }

  return claudeStreamResponse({
    system: SYSTEM,
    messages,
    maxTokens: 900,
    onFinal: async (u) => {
      await supabase.from('post_maker_usage').insert({
        user_id: user.id, kind,
        input_tokens: u.inputTokens, output_tokens: u.outputTokens, cost_usd: u.costUsd,
      });
    },
  });
}
