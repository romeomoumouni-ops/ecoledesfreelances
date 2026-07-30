// Lecture de vidéos hébergées ailleurs (YouTube, Vimeo, Loom, Google Drive)
// SANS jamais renvoyer l'élève vers la plateforme d'origine : on construit des
// URLs d'intégration « nues » (aucune suggestion, aucun titre, aucun partage)
// et le lecteur bloque tous les clics vers l'extérieur.

export type ExternalProvider = 'youtube' | 'vimeo' | 'loom' | 'drive';

export type ExternalVideo = {
  provider: ExternalProvider;
  id: string;
  embedUrl: string;
};

/** Reconnaît un lien de vidéo externe. Renvoie null si ce n'en est pas un. */
export function parseExternalVideo(raw: string | null | undefined): ExternalVideo | null {
  const url = (raw ?? '').trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();

  // --- YouTube (youtube.com, youtu.be, /shorts, /embed) ---
  if (host === 'youtu.be' || host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (u.searchParams.get('v')) id = u.searchParams.get('v')!;
    else {
      const m = u.pathname.match(/\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      if (m) id = m[1];
    }
    id = id.split(/[/?#&]/)[0];
    if (!/^[\w-]{6,}$/.test(id)) return null;
    // Domaine sans cookies + zéro habillage : pas de contrôles YouTube (les
    // nôtres les remplacent), pas de suggestions, pas de clavier YouTube.
    const p = new URLSearchParams({
      controls: '0',
      modestbranding: '1',
      rel: '0',
      showinfo: '0',
      iv_load_policy: '3',
      disablekb: '1',
      fs: '0',
      playsinline: '1',
      enablejsapi: '1',
    });
    return {
      provider: 'youtube',
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?${p.toString()}`,
    };
  }

  // --- Vimeo ---
  if (host.endsWith('vimeo.com')) {
    const m = u.pathname.match(/(\d{6,})/);
    if (!m) return null;
    const id = m[1];
    // Sans titre, sans auteur, sans portrait, sans badge, et « do not track »
    const p = new URLSearchParams({
      title: '0',
      byline: '0',
      portrait: '0',
      badge: '0',
      dnt: '1',
      playsinline: '1',
    });
    // Certaines vidéos privées ont un jeton (…/123456789/abcdef)
    const priv = u.pathname.match(/\/\d{6,}\/([0-9a-f]{6,})/);
    if (priv) p.set('h', priv[1]);
    return { provider: 'vimeo', id, embedUrl: `https://player.vimeo.com/video/${id}?${p.toString()}` };
  }

  // --- Loom ---
  if (host.endsWith('loom.com')) {
    const m = u.pathname.match(/\/(?:share|embed)\/([0-9a-zA-Z]+)/);
    if (!m) return null;
    const id = m[1];
    // Barre du haut masquée = plus de logo Loom, plus de « Ouvrir dans Loom »
    const p = new URLSearchParams({
      hideEmbedTopBar: 'true',
      hide_owner: 'true',
      hide_share: 'true',
      hide_title: 'true',
    });
    return { provider: 'loom', id, embedUrl: `https://www.loom.com/embed/${id}?${p.toString()}` };
  }

  // --- Google Drive ---
  if (host.endsWith('drive.google.com')) {
    const m = u.pathname.match(/\/file\/d\/([^/]+)/) || [null, u.searchParams.get('id') ?? ''];
    const id = (m[1] ?? '').trim();
    if (!id) return null;
    return { provider: 'drive', id, embedUrl: `https://drive.google.com/file/d/${id}/preview` };
  }

  return null;
}

/** Nom lisible du service (pour l'espace admin uniquement). */
export function providerLabel(p: ExternalProvider): string {
  return { youtube: 'YouTube', vimeo: 'Vimeo', loom: 'Loom', drive: 'Google Drive' }[p];
}
