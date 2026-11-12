// Médias de la communauté : URLs d'images optimisées (redimensionnées + WebP
// par Supabase à la volée), compression des photos avant envoi, et capture
// d'une vignette pour les vidéos. Objectif : une page communauté qui charge
// vite même en 3G (avant : photos de 1 à 8 Mo servies telles quelles).

/** Formats que Supabase ne doit pas transformer (GIF animés, SVG). */
const NO_TRANSFORM = /\.(gif|svg)(\?|$)/i;

/**
 * Transforme une URL publique Supabase Storage en URL « render/image »
 * redimensionnée. Toute autre URL est renvoyée telle quelle.
 *   /storage/v1/object/public/<bucket>/<path>
 *   → /storage/v1/render/image/public/<bucket>/<path>?width=…&quality=…
 */
export function imageUrl(url: string | null | undefined, width: number, quality = 75): string {
  if (!url) return '';
  if (NO_TRANSFORM.test(url)) return url;
  if (!url.includes('/storage/v1/object/public/')) return url;
  const base = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}width=${Math.round(width)}&quality=${quality}&resize=contain`;
}

/** srcset pour une image de fil (mobile → desktop). */
export function imageSrcSet(url: string | null | undefined): string | undefined {
  if (!url || NO_TRANSFORM.test(url) || !url.includes('/storage/v1/object/public/')) return undefined;
  return [480, 800, 1200].map((w) => `${imageUrl(url, w)} ${w}w`).join(', ');
}

const MAX_SIDE = 1920; // suffisant pour un fil (affiché ≤ 700 px de large)
const SKIP_BELOW = 350 * 1024; // une photo déjà légère est envoyée telle quelle

/**
 * Réduit une photo côté navigateur avant l'envoi (JPEG qualité 0.85, côté max
 * 1920 px). Renvoie le fichier d'origine si inutile ou impossible (GIF, échec).
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  if (file.size < SKIP_BELOW) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

/**
 * Capture une image de la vidéo (vers 1 s) pour servir de vignette.
 * `src` peut être un object URL (fichier local) ou une URL distante (CORS ok
 * sur le bucket public). Renvoie null si le navigateur n'y arrive pas.
 */
// Un seul élément <video> réutilisé : Chrome refuse de créer de nouveaux
// lecteurs au-delà de quelques dizaines (« too many WebMediaPlayers »).
let sharedVideo: HTMLVideoElement | null = null;
function getSharedVideo(): HTMLVideoElement {
  if (!sharedVideo) {
    sharedVideo = document.createElement('video');
    sharedVideo.crossOrigin = 'anonymous';
    sharedVideo.muted = true;
    sharedVideo.playsInline = true;
    sharedVideo.preload = 'auto';
  }
  return sharedVideo;
}

export function captureVideoPoster(src: string, maxWidth = 1280): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = getSharedVideo();
    let done = false;
    const finish = (b: Blob | null) => {
      if (done) return;
      done = true;
      video.onerror = null;
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.removeAttribute('src');
      video.load();
      resolve(b);
    };
    const timer = setTimeout(() => finish(null), 90_000);
    video.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
    video.onloadedmetadata = () => {
      const t = Math.min(1, Math.max(0.1, video.duration / 2 || 0.1));
      video.currentTime = t;
    };
    video.onseeked = () => {
      try {
        const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round((video.videoWidth || 640) * scale);
        canvas.height = Math.round((video.videoHeight || 360) * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (b) => {
            clearTimeout(timer);
            finish(b);
          },
          'image/jpeg',
          0.8
        );
      } catch {
        clearTimeout(timer);
        finish(null);
      }
    };
    video.src = src;
  });
}
