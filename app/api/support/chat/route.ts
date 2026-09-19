import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { runSupportAI, supabaseAnon, type Turn } from '@/lib/support-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Support IA public : aucune authentification. La discussion est identifiée par
 * un cookie anonyme ; tout est journalisé pour l'espace admin.
 * Anti-abus : 25 messages / heure / discussion, 60 / heure / adresse IP,
 * 1 500 caractères par message.
 */
const COOKIE = 'support_sid';
const SECRET = () => process.env.CHARIOW_GRANT_SECRET;

function ipHash(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0';
  return createHash('sha256').update(ip + '|' + (process.env.CHARIOW_GRANT_SECRET ?? '')).digest('hex').slice(0, 32);
}

export async function POST(req: NextRequest) {
  let message = '';
  try {
    message = String((await req.json())?.message ?? '').trim();
  } catch {
    /* corps vide */
  }
  if (!message) return NextResponse.json({ error: 'Message vide.' }, { status: 400 });
  if (message.length > 1500) return NextResponse.json({ error: 'Message trop long (1 500 caractères max).' }, { status: 400 });

  let sid = req.cookies.get(COOKIE)?.value ?? '';
  const fresh = !/^[0-9a-f-]{36}$/i.test(sid);
  if (fresh) sid = randomUUID();
  const ip = ipHash(req);

  const supabase = supabaseAnon();
  const { data: h } = await supabase.rpc('support_history', { p_secret: SECRET(), p_chat_id: sid, p_ip_hash: ip });
  const hist = (h ?? { messages: [], verified_email: null, chat_last_hour: 0, ip_last_hour: 0 }) as {
    messages: { role: 'user' | 'assistant'; body: string }[];
    verified_email: string | null;
    chat_last_hour: number;
    ip_last_hour: number;
  };
  if (hist.chat_last_hour >= 25 || hist.ip_last_hour >= 60) {
    return NextResponse.json({ reply: "Tu as envoyé beaucoup de messages : fais une pause de quelques minutes, ou écris-nous sur WhatsApp au +229 01 57 34 28 14." });
  }

  await supabase.rpc('support_log', { p_secret: SECRET(), p_chat_id: sid, p_role: 'user', p_body: message, p_ip_hash: ip });

  const history: Turn[] = [...hist.messages.map((m) => ({ role: m.role, body: m.body })), { role: 'user', body: message }];
  const out = await runSupportAI(history, hist.verified_email);

  for (const n of out.notes) {
    await supabase.rpc('support_log', { p_secret: SECRET(), p_chat_id: sid, p_role: 'note', p_body: n, p_ip_hash: ip });
  }
  if (out.reply) {
    await supabase.rpc('support_log', {
      p_secret: SECRET(), p_chat_id: sid, p_role: 'assistant', p_body: out.reply, p_ip_hash: ip,
      p_verified_email: out.verifiedEmail, p_outcome: out.outcome,
    });
  }

  const res = NextResponse.json({ reply: out.reply });
  if (fresh) {
    res.cookies.set(COOKIE, sid, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 30 });
  }
  return res;
}
