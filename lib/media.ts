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

/**
 * Signe PLUSIEURS fichiers en UNE SEULE requête (createSignedUrls).
 * Indispensable pour les pages de cours : signer 49 chapitres un par un
 * faisait 49 allers-retours réseau (page très lente). Renvoie chemin -> URL ;
 * un chemin absent du stockage n'a simplement pas d'entrée.
 */
export async function signMediaMany(
  paths: (string | null | undefined)[],
  expiresIn = 60 * 60 * 6
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const toSign = [...new Set(paths.filter((p): p is string => !!p && !p.startsWith('http')))];
  // URLs déjà complètes : on les renvoie telles quelles
  for (const p of paths) if (p && p.startsWith('http')) out.set(p, p);
  if (!toSign.length) return out;

  const supabase = createClient();
  const { data } = await supabase.storage.from('course-media').createSignedUrls(toSign, expiresIn);
  for (const item of data ?? []) {
    if (item?.path && item?.signedUrl && !item.error) out.set(item.path, item.signedUrl);
  }
  return out;
}
