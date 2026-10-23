// Affichage du prix dans la monnaie du visiteur (détecté par son adresse IP).
// Le montant RÉELLEMENT débité est toujours en FCFA : la conversion n'est
// qu'une indication, toujours affichée avec « ≈ ».
//
// XOF et XAF sont arrimés à l'euro (1 € = 655,957) : pour ces pays, le montant
// est déjà dans leur monnaie, aucune conversion.
// Les autres taux sont approximatifs — à rafraîchir de temps en temps.

type Devise = { code: string; symbole: string; parFcfa: number; decimales?: number };

const EUR_PAR_FCFA = 1 / 655.957; // taux fixe officiel

const DEVISES: Record<string, Devise> = {
  GN: { code: 'GNF', symbole: 'GNF', parFcfa: 14.9 },
  CD: { code: 'CDF', symbole: 'FC', parFcfa: 5.0 },
  NG: { code: 'NGN', symbole: '₦', parFcfa: 2.67 },
  GH: { code: 'GHS', symbole: 'GH₵', parFcfa: 0.0244, decimales: 0 },
  MA: { code: 'MAD', symbole: 'DH', parFcfa: 0.0165, decimales: 0 },
  DZ: { code: 'DZD', symbole: 'DA', parFcfa: 0.221, decimales: 0 },
  TN: { code: 'TND', symbole: 'DT', parFcfa: 0.0052, decimales: 0 },
  MR: { code: 'MRU', symbole: 'UM', parFcfa: 0.0608, decimales: 0 },
  CV: { code: 'CVE', symbole: '$', parFcfa: 0.168, decimales: 0 },
  US: { code: 'USD', symbole: '$', parFcfa: EUR_PAR_FCFA * 1.08, decimales: 0 },
  CA: { code: 'CAD', symbole: '$', parFcfa: EUR_PAR_FCFA * 1.47, decimales: 0 },
  GB: { code: 'GBP', symbole: '£', parFcfa: EUR_PAR_FCFA * 0.84, decimales: 0 },
  CH: { code: 'CHF', symbole: 'CHF', parFcfa: EUR_PAR_FCFA * 0.94, decimales: 0 },
};

// Pays de la zone FCFA : le prix est déjà dans leur monnaie.
const ZONE_FCFA = new Set([
  'BJ', 'CI', 'SN', 'TG', 'BF', 'ML', 'NE', 'GW', // XOF
  'CM', 'GA', 'CG', 'TD', 'CF', 'GQ',             // XAF
]);

// Pays de la zone euro (et assimilés) où l'on affiche en €.
const ZONE_EURO = new Set([
  'FR', 'BE', 'DE', 'ES', 'IT', 'PT', 'NL', 'LU', 'IE', 'AT', 'FI', 'GR', 'MC',
]);

function arrondi(v: number): number {
  if (v >= 100_000) return Math.round(v / 1000) * 1000;
  if (v >= 10_000) return Math.round(v / 100) * 100;
  if (v >= 1_000) return Math.round(v / 10) * 10;
  return Math.round(v);
}

/** Montant en FCFA, mis en forme : « 98.000 FCFA ». */
export function fcfa(montant: number): string {
  return `${montant.toLocaleString('fr-FR').replace(/ |\s/g, '.')} FCFA`;
}

/**
 * Équivalent approximatif dans la monnaie du pays, ou null si le pays est
 * déjà en FCFA (ou inconnu).
 */
export function equivalentLocal(montantFcfa: number, pays?: string | null): string | null {
  const p = (pays ?? '').toUpperCase();
  if (!p || ZONE_FCFA.has(p)) return null;

  if (ZONE_EURO.has(p)) {
    return `≈ ${Math.round(montantFcfa * EUR_PAR_FCFA)} €`;
  }
  const d = DEVISES[p];
  if (!d) return `≈ ${Math.round(montantFcfa * EUR_PAR_FCFA)} €`;

  const v = arrondi(montantFcfa * d.parFcfa);
  return `≈ ${v.toLocaleString('fr-FR').replace(/ |\s/g, ' ')} ${d.symbole}`;
}
