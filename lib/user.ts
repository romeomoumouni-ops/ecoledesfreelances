import { createClient } from '@/lib/supabase/server';
import { prettyName } from '@/lib/format';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  handle: string;
  avatar_url: string | null;
  is_admin: boolean;
  is_super_admin: boolean;
  points: number;
  streak: number;
  courses_completed: number;
};

/** Profil de l'utilisateur connecté (ou null). */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: p } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // Sans nom renseigné, on met en forme le début de l'e-mail
  // (« esnard.ngoua » → « Esnard Ngoua ») au lieu de l'afficher brut.
  const name = p?.full_name || prettyName(user.email);
  return {
    id: user.id,
    email: user.email ?? '',
    full_name: name,
    handle: p?.handle ?? '@' + name.toLowerCase().replace(/\s+/g, ''),
    avatar_url: p?.avatar_url ?? null,
    is_admin: p?.is_admin ?? false,
    is_super_admin: p?.is_super_admin ?? false,
    points: p?.points ?? 0,
    streak: p?.streak ?? 0,
    courses_completed: p?.courses_completed ?? 0,
  };
}

/** Clés des tâches d'objectif complétées par l'utilisateur connecté. */
export async function getMyTaskKeys(): Promise<string[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from('task_completions').select('task_key').eq('user_id', user.id);
  return (data ?? []).map((r) => r.task_key as string);
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function profileInitials(p: { full_name: string; email: string }) {
  return initialsOf(p.full_name || p.email || 'M');
}
