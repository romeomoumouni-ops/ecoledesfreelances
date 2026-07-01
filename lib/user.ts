import { createClient } from '@/lib/supabase/server';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  handle: string;
  avatar_url: string | null;
  is_admin: boolean;
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

  const name = p?.full_name || (user.email ? user.email.split('@')[0] : 'Membre');
  return {
    id: user.id,
    email: user.email ?? '',
    full_name: name,
    handle: p?.handle ?? '@' + name.toLowerCase().replace(/\s+/g, ''),
    avatar_url: p?.avatar_url ?? null,
    is_admin: p?.is_admin ?? false,
    points: p?.points ?? 0,
    streak: p?.streak ?? 0,
    courses_completed: p?.courses_completed ?? 0,
  };
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
