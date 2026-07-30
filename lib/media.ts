import { createClient } from '@/lib/supabase/server';

// Durée de validité des URLs vidéo signées (7 jours) et marge de renouvellement
// (on re-signe quand il reste moins d'un jour). Une URL stable = le navigateur
// réutilise son cache d'une visite à l'autre au lieu de tout re-télécharger.
const SIGNED_TTL_SECONDS = 60 * 60 * 24 * 7;
const REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000;

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
  expiresIn = SIGNED_TTL_SECONDS
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const wanted = [...new Set(paths.filter((p): p is string => !!p && !p.startsWith('http')))];
  // URLs déjà complètes : on les renvoie telles quelles
  for (const p of paths) if (p && p.startsWith('http')) out.set(p, p);
  if (!wanted.length) return out;

  const supabase = createClient();

  // 1) URLs déjà en cache et encore valables un bon moment : on RÉUTILISE la
  //    même URL -> le navigateur retrouve la vidéo dans son cache (instantané).
  const freshUntil = new Date(Date.now() + REFRESH_MARGIN_MS).toISOString();
  const { data: cached } = await supabase
    .from('media_url_cache')
    .select('path, url')
    .in('path', wanted)
    .gt('expires_at', freshUntil);
  for (const row of cached ?? []) out.set(row.path as string, row.url as string);

  // 2) Ce qui manque (ou expire bientôt) : on signe en UNE requête
  const toSign = wanted.filter((p) => !out.has(p));
  if (!toSign.length) return out;

  const { data } = await supabase.storage.from('course-media').createSignedUrls(toSign, expiresIn);
  const rows: { path: string; url: string; expires_at: string; updated_at: string }[] = [];
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const now = new Date().toISOString();
  for (const item of data ?? []) {
    if (item?.path && item?.signedUrl && !item.error) {
      out.set(item.path, item.signedUrl);
      rows.push({ path: item.path, url: item.signedUrl, expires_at: expiresAt, updated_at: now });
    }
  }
  // 3) Mémorisation pour les prochaines visites (et pour les autres élèves)
  if (rows.length) await supabase.from('media_url_cache').upsert(rows, { onConflict: 'path' });

  return out;
}
