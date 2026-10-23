// Vérification d'une adresse e-mail à la saisie, côté page de vente.
// Objectif : qu'aucun acheteur ne paie avec une adresse où rien n'arrivera.

const DOMAINES_COURANTS = [
  'gmail.com', 'yahoo.com', 'yahoo.fr', 'hotmail.com', 'hotmail.fr', 'outlook.com',
  'outlook.fr', 'icloud.com', 'live.fr', 'live.com', 'orange.fr', 'protonmail.com',
  'proton.me', 'aol.com', 'free.fr', 'sfr.fr', 'laposte.net', 'ymail.com', 'mail.com',
];

/** Distance de Levenshtein (petites chaînes). */
function distance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

export type VerifEmail =
  | { etat: 'vide' }
  | { etat: 'invalide'; message: string }
  | { etat: 'suspect'; message: string; suggestion: string }
  | { etat: 'ok' };

/** Analyse une adresse saisie : format, puis faute de frappe sur le domaine. */
export function verifierEmail(saisie: string): VerifEmail {
  const v = (saisie ?? '').trim().toLowerCase();
  if (!v) return { etat: 'vide' };

  if (/\s/.test(v)) return { etat: 'invalide', message: 'Ton adresse contient un espace.' };
  if (!v.includes('@')) return { etat: 'invalide', message: 'Il manque le @ dans ton adresse.' };
  if ((v.match(/@/g) || []).length > 1) return { etat: 'invalide', message: 'Ton adresse contient deux @.' };

  const [local, domaine] = v.split('@');
  if (!local) return { etat: 'invalide', message: 'Il manque ton nom avant le @.' };
  if (!domaine) return { etat: 'invalide', message: 'Il manque le fournisseur après le @ (ex. gmail.com).' };
  if (!domaine.includes('.')) return { etat: 'invalide', message: 'Il manque le point dans le domaine (ex. gmail.com).' };
  if (/\.$/.test(domaine) || /^\./.test(domaine) || domaine.includes('..')) {
    return { etat: 'invalide', message: 'Le domaine de ton adresse est mal écrit.' };
  }
  const ext = domaine.split('.').pop() ?? '';
  if (ext.length < 2) return { etat: 'invalide', message: 'La fin de ton adresse est incomplète (ex. .com).' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v)) {
    return { etat: 'invalide', message: 'Cette adresse e-mail n’est pas valide.' };
  }

  // Faute de frappe sur un grand fournisseur (gmial.com, gmai.com, yaho.com…)
  if (!DOMAINES_COURANTS.includes(domaine)) {
    let meilleur = '', d = 99;
    for (const ref of DOMAINES_COURANTS) {
      const dd = distance(domaine, ref);
      if (dd < d) { d = dd; meilleur = ref; }
    }
    if (d >= 1 && d <= 2) {
      return {
        etat: 'suspect',
        message: `Tu voulais écrire ${local}@${meilleur} ?`,
        suggestion: `${local}@${meilleur}`,
      };
    }
  }
  return { etat: 'ok' };
}
