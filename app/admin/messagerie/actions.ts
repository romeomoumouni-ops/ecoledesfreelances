'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentProfile } from '@/lib/user';
import { createClient } from '@/lib/supabase/server';
import { sendBroadcastEmail } from '@/lib/email';

/** Diffuser un message dans la boîte de réception plateforme de TOUS les élèves. */
export async function broadcastPlatform(
  title: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) return { ok: false, error: 'Non autorisé.' };
  const text = body.trim();
  if (!text) return { ok: false, error: 'Le message est vide.' };

  const supabase = createClient();
  const { error } = await supabase.from('announcements').insert({
    title: title.trim() || null,
    body: text,
    author_name: profile.full_name || "L'équipe",
    created_by: profile.id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/messagerie');
  return { ok: true };
}

/** Récupère tous les élèves (non-admin, non-bannis) : id + e-mail. */
async function students(): Promise<{ id: string; email: string | null }[]> {
  const supabase = createClient();
  const list: { id: string; email: string | null }[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, is_admin, banned')
      .range(from, from + PAGE - 1);
    const rows = data ?? [];
    for (const r of rows) {
      if (!r.is_admin && !r.banned) list.push({ id: r.id as string, email: (r.email as string) ?? null });
    }
    if (rows.length < PAGE) break;
  }
  return list;
}

/**
 * Envoyer un e-mail à TOUS les élèves ET déposer le même message dans leur
 * messagerie plateforme, comme si Mariane (assistante de M. Roméo) l'avait écrit.
 */
export async function broadcastEmail(
  subject: string,
  message: string
): Promise<{ ok: boolean; sent?: number; total?: number; inbox?: number; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) return { ok: false, error: 'Non autorisé.' };
  const sub = subject.trim();
  const msg = message.trim();
  if (!sub || !msg) return { ok: false, error: 'Sujet et message requis.' };
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "L'envoi d'e-mails n'est pas configuré (RESEND_API_KEY manquante)." };
  }

  const list = await students();
  if (!list.length) return { ok: false, error: 'Aucun destinataire trouvé.' };

  const supabase = createClient();

  // 1) Message dans la messagerie plateforme (fil « Mariane »), même contenu que le mail
  const inboxBody = `${sub}\n\n${msg}`;
  const rows = list.map((s) => ({
    recipient: 'marianne',
    student_id: s.id,
    sender_id: profile.id,
    sender_name: 'Mariane',
    from_admin: true,
    body: inboxBody,
  }));
  let inbox = 0;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error, count } = await supabase
      .from('support_messages')
      .insert(slice, { count: 'exact' });
    if (!error) inbox += count ?? slice.length;
  }

  // 2) E-mail (via Resend) aux élèves qui ont une adresse, par petits lots
  const emails = Array.from(
    new Set(list.map((s) => s.email).filter((e): e is string => !!e).map((e) => e.toLowerCase()))
  );
  let sent = 0;
  const BATCH = 10;
  for (let i = 0; i < emails.length; i += BATCH) {
    const slice = emails.slice(i, i + BATCH);
    const results = await Promise.all(slice.map((to) => sendBroadcastEmail(to, sub, msg)));
    sent += results.filter(Boolean).length;
  }

  return { ok: true, sent, total: emails.length, inbox };
}

/** Supprimer une annonce plateforme. */
export async function deleteAnnouncement(id: string): Promise<{ ok: boolean; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) return { ok: false, error: 'Non autorisé.' };
  const supabase = createClient();
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/messagerie');
  return { ok: true };
}
