import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { contactByKey } from '@/lib/coaches';
import { generateCoachReply, type AutopilotContext } from '@/lib/coach-autopilot';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Appelée par Postgres (trigger pg_net) dès qu'un élève écrit à un coach dont
 * le pilote automatique est activé. Génère la réponse et la poste dans le fil
 * au nom du coach (marquée ai_generated pour l'espace admin).
 *
 * Sécurité : Authorization: Bearer CHARIOW_GRANT_SECRET (connu de la base et
 * du serveur). Toutes les lectures/écritures passent par des RPC protégées.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CHARIOW_GRANT_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let messageId = '';
  try {
    const body = await req.json();
    messageId = String(body?.message_id ?? '');
  } catch {
    /* corps vide */
  }
  if (!/^[0-9a-f-]{36}$/i.test(messageId)) {
    return NextResponse.json({ ok: false, error: 'message_id' }, { status: 400 });
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: ctx, error } = await supabase.rpc('autopilot_context', {
    p_secret: secret,
    p_message_id: messageId,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!ctx || (ctx as { skip?: string }).skip) {
    return NextResponse.json({ ok: true, skipped: (ctx as { skip?: string })?.skip ?? 'no_context' });
  }

  const context = ctx as AutopilotContext;
  const reply = await generateCoachReply(context);
  if (!reply) return NextResponse.json({ ok: true, skipped: 'no_reply' });

  const coach = contactByKey(context.recipient);
  const { data: id, error: insErr } = await supabase.rpc('autopilot_reply', {
    p_secret: secret,
    p_message_id: messageId,
    p_body: reply,
    p_sender_name: coach?.name ?? 'Coach',
  });
  if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, reply_id: id, chars: reply.length });
}
