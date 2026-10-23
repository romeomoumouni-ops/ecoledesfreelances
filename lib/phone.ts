// Normalisation des numéros Mobile Money pour l'API Chariow.
// Chariow refuse un numéro mal formé (« Invalid phone number. Check the number
// and country code. ») : plutôt que de renvoyer l'élève vers le formulaire
// Chariow, on essaie les écritures possibles du même numéro.

/** Indicatif téléphonique par pays (ceux proposés au paiement). */
export const INDICATIFS: Record<string, string> = {
  BJ: '229', CI: '225', SN: '221', TG: '228', CM: '237', BF: '226', ML: '223',
  GN: '224', NE: '227', CD: '243', CG: '242', GA: '241', TD: '235', MG: '261',
  RW: '250', BI: '257', MR: '222', GW: '245', CF: '236', GQ: '240', KM: '269',
  DJ: '253', MA: '212', DZ: '213', TN: '216', NG: '234', GH: '233', KE: '254',
  ZA: '27', CV: '238', LR: '231', SL: '232', GM: '220', ST: '239', FR: '33',
  BE: '32', CH: '41', CA: '1', US: '1', GB: '44', DE: '49', ES: '34', IT: '39',
  PT: '351', NL: '31', LU: '352',
};

export function indicatif(pays: string): string {
  return INDICATIFS[(pays || '').toUpperCase()] ?? '';
}

/**
 * Écritures possibles d'un même numéro, de la plus probable à la moins
 * probable : national sans zéro, national avec zéro, avec indicatif, etc.
 * Chariow sera interrogé avec chacune jusqu'à ce qu'une passe.
 */
export function variantesNumero(brut: string, pays: string): string[] {
  const digits = (brut || '').replace(/\D/g, '');
  if (!digits) return [];
  const ind = indicatif(pays);

  // Numéro saisi avec son indicatif (ex. 22901573428) : on isole le national.
  let national = digits;
  if (ind && digits.startsWith(ind) && digits.length > ind.length + 5) {
    national = digits.slice(ind.length);
  }
  const sansZero = national.replace(/^0+/, '');

  const candidats = [
    national,                    // tel que saisi (hors indicatif)
    sansZero,                    // sans le zéro initial
    `0${sansZero}`,              // avec un zéro initial
    ind ? `${ind}${sansZero}` : '', // avec l'indicatif
    digits,                      // la saisie brute
  ];

  // Doublons retirés, longueurs plausibles seulement
  return [...new Set(candidats)].filter((c) => c.length >= 6 && c.length <= 15);
}
