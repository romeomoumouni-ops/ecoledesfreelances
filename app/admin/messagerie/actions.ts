'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentProfile } from '@/lib/user';
import { createClient } from '@/lib/supabase/server';
import { sendBroadcastBatch } from '@/lib/email';

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
): Promise<{ ok: boolean; sent?: number; total?: number; inbox?: number; warning?: string; error?: string }> {
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

  // 2) E-mail (via Resend, API batch) aux élèves qui ont une adresse
  const emails = Array.from(
    new Set(list.map((s) => s.email).filter((e): e is string => !!e).map((e) => e.toLowerCase()))
  );
  const { sent, failed, error } = await sendBroadcastBatch(emails, sub, msg);

  return {
    ok: true,
    sent,
    total: emails.length,
    inbox,
    warning:
      failed > 0
        ? `${failed} e-mail(s) non envoyé(s)${error ? ` — Resend: ${error}` : ''}. ` +
          `Vérifie ton quota / plan Resend (le message est bien arrivé dans la messagerie de tous les élèves).`
        : undefined,
  };
}

/**
 * Renvoyer le DERNIER e-mail de diffusion à tous les élèves — e-mail SEUL,
 * sans recréer de message dans la messagerie (les élèves l'ont déjà reçu).
 * Sert à rattraper les envois qui avaient échoué (limite de débit Resend).
 */
export async function resendLastBroadcastEmail(): Promise<{
  ok: boolean;
  sent?: number;
  total?: number;
  warning?: string;
  error?: string;
}> {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) return { ok: false, error: 'Non autorisé.' };
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "L'envoi d'e-mails n'est pas configuré (RESEND_API_KEY manquante)." };
  }

  const supabase = createClient();
  const { data: last } = await supabase
    .from('support_messages')
    .select('body, created_at')
    .eq('recipient', 'marianne')
    .eq('from_admin', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last?.body) return { ok: false, error: 'Aucun message précédent à renvoyer.' };

  // Le corps stocké = "sujet\n\nmessage" (format de la diffusion e-mail)
  const body = last.body as string;
  const sep = body.indexOf('\n\n');
  const subject = sep > 0 ? body.slice(0, sep).trim() : "L'École des Freelances";
  const message = sep > 0 ? body.slice(sep + 2).trim() : body;

  const list = await students();
  const emails = Array.from(
    new Set(list.map((s) => s.email).filter((e): e is string => !!e).map((e) => e.toLowerCase()))
  );
  if (!emails.length) return { ok: false, error: 'Aucun destinataire trouvé.' };

  const { sent, failed, error } = await sendBroadcastBatch(emails, subject, message);
  return {
    ok: true,
    sent,
    total: emails.length,
    warning:
      failed > 0
        ? `${failed} e-mail(s) non envoyé(s)${error ? ` — Resend: ${error}` : ''}.`
        : undefined,
  };
}

/**
 * Diagnostic : envoie UN e-mail de test à l'adresse donnée et renvoie la
 * réponse BRUTE de Resend (statut + corps) ainsi que l'adresse "from" réelle
 * utilisée en production. Aucun secret n'est exposé (jamais la clé API).
 */
export async function sendTestEmail(to: string): Promise<{ ok: boolean; info: string }> {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) return { ok: false, info: 'Non autorisé.' };

  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "L'École des Freelances <onboarding@resend.dev>";
  if (!key) return { ok: false, info: 'RESEND_API_KEY manquante côté serveur.' };

  const addr = to.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) return { ok: false, info: 'Adresse e-mail invalide.' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: addr,
        subject: "Test d'envoi — L'École des Freelances",
        html: "<p>Ceci est un e-mail de test envoyé depuis la messagerie admin. Si tu le reçois, l'envoi fonctionne ✅</p>",
      }),
    });
    const text = await res.text();
    return {
      ok: res.ok,
      info:
        `Expéditeur (from) utilisé : ${from}\n` +
        `Statut Resend : ${res.status}\n` +
        `Réponse : ${text.slice(0, 500)}`,
    };
  } catch (e) {
    return { ok: false, info: e instanceof Error ? e.message : 'Erreur réseau.' };
  }
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
