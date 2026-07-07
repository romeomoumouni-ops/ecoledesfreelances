'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/user';
import { sendBroadcastBatch } from '@/lib/email';
import type { SupabaseClient } from '@supabase/supabase-js';

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');
  const { data: prof } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!prof?.is_admin) throw new Error('Accès réservé aux administrateurs');
  return supabase;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

/* ---------------- COURS ---------------- */
export async function createCourse(formData: FormData) {
  const supabase = await requireAdmin();
  const title = String(formData.get('title') || '').trim();
  if (!title) throw new Error('Titre requis');

  const base = slugify(title) || 'cours';
  const id = `${base}-${Date.now().toString(36).slice(-4)}`;

  const { error } = await supabase.from('courses').insert({
    id,
    title,
    category: String(formData.get('category') || 'Général'),
    level: String(formData.get('level') || 'Débutant'),
    instructor: String(formData.get('instructor') || ''),
    description: String(formData.get('description') || ''),
    hours: Number(formData.get('hours') || 0),
    lessons: Number(formData.get('lessons') || 0),
    tag: String(formData.get('tag') || '') || null,
    color: '#1d1d1f',
    rating: 0,
    students: 0,
    sort: Date.now() % 100000,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/cours');
  // On amène directement l'admin sur la page de construction du cours
  // (curriculums, upload vidéos, quiz).
  redirect(`/admin/cours/${id}`);
}

export async function deleteCourse(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/cours');
}

/* ---------------- LIVE ---------------- */

/** Tous les comptes non bannis : id + e-mail + is_admin (paginé). */
async function allRecipients(
  supabase: SupabaseClient
): Promise<{ id: string; email: string | null; is_admin: boolean }[]> {
  const list: { id: string; email: string | null; is_admin: boolean }[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, is_admin, banned')
      .range(from, from + PAGE - 1);
    const rows = data ?? [];
    for (const r of rows) {
      if (!r.banned) list.push({ id: r.id as string, email: (r.email as string) ?? null, is_admin: !!r.is_admin });
    }
    if (rows.length < PAGE) break;
  }
  return list;
}

/**
 * Prévient TOUT LE MONDE qu'un live vient d'être programmé, sur 3 canaux :
 *  1. notification plateforme (announcements → cloche + pastille de tous)
 *  2. message automatique de Mariane dans la messagerie de chaque élève
 *  3. e-mail à tous les élèves (Resend)
 * Les échecs d'e-mail ne bloquent pas la création du live.
 */
async function notifyNewLive(
  supabase: SupabaseClient,
  adminId: string,
  adminName: string,
  live: { coach: string; theme: string; dateLabel: string; timeLabel: string }
) {
  const coach = live.coach || 'un coach';
  const when = [live.dateLabel, live.timeLabel].filter(Boolean).join(' à ');
  const subject = `📅 Nouveau live : ${live.theme}`;
  const message =
    `Un nouveau live vient d'être programmé par ${coach} :\n\n` +
    `« ${live.theme} »${when ? `\n🗓️ ${when}` : ''}\n\n` +
    `Rendez-vous dans l'onglet « Live » de la plateforme pour le rejoindre. À très vite !`;

  // 1) Notification plateforme (cloche) pour tout le monde
  await supabase.from('announcements').insert({
    title: subject,
    body: message,
    author_name: adminName || "L'équipe",
    created_by: adminId,
  });

  // Destinataires
  const all = await allRecipients(supabase);
  const students = all.filter((r) => !r.is_admin);

  // 2) Message automatique de Mariane dans la messagerie de chaque élève
  const inboxBody = `${subject}\n\n${message}`;
  const rows = students.map((s) => ({
    recipient: 'marianne',
    student_id: s.id,
    sender_id: adminId,
    sender_name: 'Mariane',
    from_admin: true,
    body: inboxBody,
  }));
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await supabase.from('support_messages').insert(rows.slice(i, i + CHUNK));
  }

  // 3) E-mail à tous (non bloquant)
  if (process.env.RESEND_API_KEY) {
    const emails = Array.from(
      new Set(all.map((s) => s.email).filter((e): e is string => !!e).map((e) => e.toLowerCase()))
    );
    if (emails.length) {
      try {
        await sendBroadcastBatch(emails, subject, message);
      } catch {
        /* l'e-mail a échoué : la notif + le message Mariane sont déjà partis */
      }
    }
  }
}

export async function createLive(formData: FormData) {
  const supabase = await requireAdmin();
  const theme = String(formData.get('theme') || '').trim();
  if (!theme) throw new Error('Thème requis');

  const coach = String(formData.get('coach') || '');
  const dateLabel = String(formData.get('date_label') || '');
  const timeLabel = String(formData.get('time_label') || '');

  const { error } = await supabase.from('live_sessions').insert({
    date_label: dateLabel,
    time_label: timeLabel,
    coach,
    theme,
    is_live: formData.get('is_live') === 'on',
    meeting_url: String(formData.get('meeting_url') || '').trim() || null,
    sort: Date.now() % 100000,
  });
  if (error) throw new Error(error.message);

  // Prévenir tout le monde (notif + message Mariane + e-mail). Non bloquant :
  // si ça échoue, le live est quand même bien créé.
  try {
    const profile = await getCurrentProfile();
    if (profile) {
      await notifyNewLive(supabase, profile.id, profile.full_name, { coach, theme, dateLabel, timeLabel });
    } else {
      console.error('createLive: profil admin introuvable — notifications de live non envoyées');
    }
  } catch (e) {
    // Le live est créé quand même ; on trace l'échec pour les logs Vercel.
    console.error('createLive: échec des notifications', e);
  }

  revalidatePath('/admin/live');
}

/**
 * MODE TEST : envoie un exemple de notification de live À L'ADMIN SEUL
 * (message Mariane dans sa messagerie + e-mail à sa propre adresse), sans créer
 * de live ni notifier les étudiants. Sert à vérifier que l'envoi fonctionne.
 */
export async function testLiveNotification(): Promise<{ ok: boolean; info: string }> {
  const supabase = await requireAdmin();
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, info: 'Profil introuvable.' };

  const subject = '📅 [TEST] Nouveau live : Trouver ses premiers clients';
  const message =
    'Ceci est un TEST de la notification de live (envoyé à toi seul, pas aux étudiants).\n\n' +
    'Un nouveau live vient d’être programmé par Coach Roméo :\n\n' +
    '« Trouver ses premiers clients »\n🗓️ Dimanche à 19h00\n\n' +
    'Rendez-vous dans l’onglet « Live » de la plateforme pour le rejoindre.';

  // 1) Message de Mariane dans TA propre messagerie (test in-app)
  const { error: msgErr } = await supabase.from('support_messages').insert({
    recipient: 'marianne',
    student_id: profile.id,
    sender_id: profile.id,
    sender_name: 'Mariane',
    from_admin: true,
    body: `${subject}\n\n${message}`,
  });

  // 2) E-mail à TON adresse uniquement
  let emailInfo: string;
  if (!process.env.RESEND_API_KEY) {
    emailInfo = 'E-mail non envoyé : RESEND_API_KEY absente côté serveur.';
  } else if (!profile.email) {
    emailInfo = 'E-mail non envoyé : aucune adresse sur ton compte.';
  } else {
    try {
      const { failed, error } = await sendBroadcastBatch([profile.email], subject, message);
      emailInfo =
        failed > 0
          ? `E-mail : échec d’envoi${error ? ` (${error})` : ''}.`
          : `E-mail envoyé à ${profile.email} ✅ (vérifie aussi les spams).`;
    } catch (e) {
      emailInfo = `E-mail : erreur (${e instanceof Error ? e.message : 'inconnue'}).`;
    }
  }

  return {
    ok: true,
    info:
      `Test envoyé à toi seul.\n` +
      `• Message Mariane : ${
        msgErr ? 'échec — ' + msgErr.message : 'déposé dans ta messagerie (bouton « Contacter les coachs » → Mariane)'
      }\n` +
      `• ${emailInfo}\n` +
      `• Cloche : lors d’un VRAI live, une notification apparaît pour tout le monde (même mécanisme, déjà éprouvé).`,
  };
}

export async function deleteLive(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from('live_sessions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/live');
}

/* ---------------- DEVOIRS ---------------- */
export async function createAssignment(formData: FormData) {
  const supabase = await requireAdmin();
  const title = String(formData.get('title') || '').trim();
  if (!title) throw new Error('Titre requis');
  const { error } = await supabase.from('assignments').insert({
    title,
    course: String(formData.get('course') || '').trim() || null,
    due: String(formData.get('due') || '').trim() || null,
    points: Number(formData.get('points') || 0),
    status: 'À rendre',
    sort: Date.now() % 100000,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/devoirs');
}

export async function deleteAssignment(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from('assignments').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/devoirs');
}

/* ---------------- MODÉRATION COMMUNAUTÉ ---------------- */
export async function deletePost(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from('community_posts').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/communaute');
}

export async function deletePostComment(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from('community_comments').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/communaute');
}

/** Rétablit une publication auto-signalée : elle réapparaît dans le fil. */
export async function unflagPost(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from('community_posts')
    .update({ flagged: false, flag_reason: null })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/communaute');
}

/* ---------------- UTILISATEURS ---------------- */
export async function setUserAdmin(userId: string, makeAdmin: boolean) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: makeAdmin })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/utilisateurs');
}
