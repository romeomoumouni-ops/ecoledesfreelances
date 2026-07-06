'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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
export async function createLive(formData: FormData) {
  const supabase = await requireAdmin();
  const theme = String(formData.get('theme') || '').trim();
  if (!theme) throw new Error('Thème requis');

  const { error } = await supabase.from('live_sessions').insert({
    date_label: String(formData.get('date_label') || ''),
    time_label: String(formData.get('time_label') || ''),
    coach: String(formData.get('coach') || ''),
    theme,
    is_live: formData.get('is_live') === 'on',
    meeting_url: String(formData.get('meeting_url') || '').trim() || null,
    sort: Date.now() % 100000,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/live');
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
