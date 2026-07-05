/**
 * Adresse e-mail « fantôme » envoyée à Chariow à la place de la vraie adresse
 * du client, pour que Chariow n'envoie PAS ses e-mails automatiques (licence,
 * reçu…) au client. L'identifiant du compte est encodé dans l'adresse : elle
 * traverse Chariow à l'identique, donc le webhook peut retrouver le bon compte
 * de façon 100 % fiable (puis c'est NOUS qui envoyons l'e-mail de confirmation).
 */

const GHOST_DOMAIN = 'ghost.lecoledesfreelances.com';

export function ghostEmail(userId: string): string {
  return `u-${userId}@${GHOST_DOMAIN}`;
}

const GHOST_RE = new RegExp(
  `^u-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@${GHOST_DOMAIN.replace(/\./g, '\\.')}$`,
  'i'
);

/** Extrait l'identifiant du compte d'une adresse fantôme, ou null si ce n'en est pas une. */
export function parseGhostUserId(email: string | null | undefined): string | null {
  if (!email) return null;
  const m = GHOST_RE.exec(email.trim());
  return m ? m[1].toLowerCase() : null;
}

// Adresse fantôme pour un achat depuis la page de vente (prospect sans compte) :
// le token renvoie au vrai e-mail stocké dans pending_checkouts.
export function joinGhostEmail(token: string): string {
  return `join-${token}@${GHOST_DOMAIN}`;
}

const JOIN_RE = new RegExp(
  `^join-([a-z0-9]{16,})@${GHOST_DOMAIN.replace(/\./g, '\\.')}$`,
  'i'
);

/** Extrait le token d'inscription d'une adresse fantôme, ou null. */
export function parseJoinToken(email: string | null | undefined): string | null {
  if (!email) return null;
  const m = JOIN_RE.exec(email.trim());
  return m ? m[1].toLowerCase() : null;
}
