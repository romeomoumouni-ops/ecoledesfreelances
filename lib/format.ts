// Petits utilitaires d'affichage partagés (noms, dates relatives, pluriels).

/**
 * Rend un nom présentable. Beaucoup de comptes n'ont pas de nom complet : on
 * retombe alors sur le début de l'e-mail (« esnard.ngoua-nzanga ») → on le
 * transforme en « Esnard Ngoua Nzanga ». Les vrais noms déjà mis en forme
 * (avec espaces / majuscules) ne sont pas dénaturés.
 */
export function prettyName(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return 'Membre';
  // Si c'est un e-mail complet, ne garder que la partie avant le @.
  const base = s.includes('@') ? s.split('@')[0] : s;
  // Ressemble à un identifiant (pas d'espace, séparateurs techniques) ?
  const looksLikeLogin = !base.includes(' ');
  if (!looksLikeLogin) return base;
  return base
    .split(/[._\-]+/)
    .filter(Boolean)
    .map((w) => (w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** « il y a 5 min », « il y a 2 j », puis date complète au-delà d'une semaine. */
export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `il y a ${Math.floor(s / 86400)} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** « 5 leçons », « 1 leçon » — pluriel simple. */
export function plural(n: number, singular: string, pluralForm?: string): string {
  return `${n.toLocaleString('fr-FR')} ${n > 1 ? pluralForm ?? singular + 's' : singular}`;
}
