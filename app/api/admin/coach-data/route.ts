import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Boîte de data COMMUNE à tous les coachs : ajoute un élément (texte, PDF ou
 * page web) que l'IA du pilote automatique utilisera pour répondre aux élèves.
 * Le texte est extrait ici, côté serveur, et stocké prêt à l'emploi.
 * Réservé aux admins (tous les coachs le sont).
 */

const MAX_CHARS = 120_000; // par document, après extraction
const MAX_PDF_BYTES = 15 * 1024 * 1024;

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null };
  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  return { supabase, user: prof?.is_admin ? user : null };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

function clean(text: string): string {
  return text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Page web → texte lisible (on retire scripts, styles, balises). */
function htmlToText(html: string): string {
  const noScript = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(nav|footer|header|aside)[\s\S]*?<\/\1>/gi, ' ');
  const withBreaks = noScript
    .replace(/<\/(p|div|li|h[1-6]|tr|br|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');
  const text = withBreaks.replace(/<[^>]+>/g, ' ');
  return clean(decodeEntities(text).replace(/[ \t]{2,}/g, ' '));
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Réservé aux administrateurs.' }, { status: 403 });

  const form = await req.formData();
  const kind = String(form.get('kind') ?? '');

  let title = String(form.get('title') ?? '').trim().slice(0, 120);
  let content = '';
  let source: string | null = null;
  let storagePath: string | null = null;

  try {
    if (kind === 'text') {
      content = clean(String(form.get('content') ?? ''));
      if (!title) title = content.split('\n')[0].slice(0, 80) || 'Note';
    } else if (kind === 'url') {
      const raw = String(form.get('url') ?? '').trim();
      let u: URL;
      try { u = new URL(raw); } catch { return NextResponse.json({ error: 'Adresse web invalide.' }, { status: 400 }); }
      if (!/^https?:$/.test(u.protocol)) return NextResponse.json({ error: 'Adresse web invalide.' }, { status: 400 });
      const res = await fetch(u.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EcoleDesFreelancesBot/1.0)' },
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) return NextResponse.json({ error: `La page a répondu ${res.status}.` }, { status: 400 });
      const html = await res.text();
      const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (!title) title = decodeEntities(m?.[1] ?? u.hostname).trim().slice(0, 120) || u.hostname;
      content = htmlToText(html);
      source = u.toString();
    } else if (kind === 'pdf') {
      const file = form.get('file');
      if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });
      if (file.size > MAX_PDF_BYTES) return NextResponse.json({ error: 'PDF trop lourd (15 Mo max).' }, { status: 400 });
      const buf = Buffer.from(await file.arrayBuffer());
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (b: Buffer) => Promise<{ text: string }>;
      const parsed = await pdfParse(buf);
      content = clean(parsed.text ?? '');
      if (!title) title = file.name.replace(/\.pdf$/i, '').slice(0, 120) || 'Document PDF';
      source = file.name;
      // On conserve l'original dans le bucket privé (relecture / re-extraction)
      storagePath = `${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('coach-data').upload(storagePath, buf, {
        contentType: 'application/pdf', upsert: false,
      });
      if (upErr) storagePath = null; // le texte extrait suffit à l'IA
    } else {
      return NextResponse.json({ error: 'Type inconnu.' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Extraction impossible.' }, { status: 400 });
  }

  if (content.length < 20) {
    return NextResponse.json({ error: 'Aucun texte exploitable trouvé (document vide ou image scannée).' }, { status: 400 });
  }
  if (content.length > MAX_CHARS) content = content.slice(0, MAX_CHARS) + '\n[…]';

  const { data, error } = await supabase
    .from('coach_reply_data')
    .insert({ kind, title, content, source, storage_path: storagePath, created_by: user.id })
    .select('id, kind, title, source, chars, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(req: NextRequest) {
  const { supabase, user } = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Réservé aux administrateurs.' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id') ?? '';
  const { data: row } = await supabase.from('coach_reply_data').select('storage_path').eq('id', id).maybeSingle();
  if (row?.storage_path) await supabase.storage.from('coach-data').remove([row.storage_path]);
  const { error } = await supabase.from('coach_reply_data').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
