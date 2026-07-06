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

/** Récupère les e-mails de tous les élèves (non-admin, non-bannis). */
async function studentEmails(): Promise<string[]> {
  const supabase = createClient();
  const emails: string[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from('profiles')
      .select('email, is_admin, banned')
      .not('email', 'is', null)
      .range(from, from + PAGE - 1);
    const rows = data ?? [];
    for (const r of rows) {
      if (!r.is_admin && !r.banned && r.email) emails.push((r.email as string).toLowerCase());
    }
    if (rows.length < PAGE) break;
  }
  return Array.from(new Set(emails));
}

/** Envoyer un e-mail à TOUS les élèves. */
export async function broadcastEmail(
  subject: string,
  message: string
): Promise<{ ok: boolean; sent?: number; total?: number; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) return { ok: false, error: 'Non autorisé.' };
  const sub = subject.trim();
  const msg = message.trim();
  if (!sub || !msg) return { ok: false, error: 'Sujet et message requis.' };
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "L'envoi d'e-mails n'est pas configuré (RESEND_API_KEY manquante)." };
  }

  const recipients = await studentEmails();
  if (!recipients.length) return { ok: false, error: 'Aucun destinataire trouvé.' };

  // Envoi par petits lots pour ménager le rate limit Resend
  let sent = 0;
  const BATCH = 10;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const slice = recipients.slice(i, i + BATCH);
    const results = await Promise.all(slice.map((to) => sendBroadcastEmail(to, sub, msg)));
    sent += results.filter(Boolean).length;
  }
  return { ok: true, sent, total: recipients.length };
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
