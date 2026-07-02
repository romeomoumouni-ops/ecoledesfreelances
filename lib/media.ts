import { createClient } from '@/lib/supabase/server';

/**
 * Génère une URL signée (temporaire) pour un fichier du bucket privé course-media.
 * `path` = chemin de stockage (ex. videos/<cours>/<uuid>.mp4). Renvoie null si absent.
 */
export async function signMedia(
  path: string | null | undefined,
  expiresIn = 60 * 60 * 4
): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith('http')) return path; // déjà une URL complète (sécurité)
  const supabase = createClient();
  const { data } = await supabase.storage.from('course-media').createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}
