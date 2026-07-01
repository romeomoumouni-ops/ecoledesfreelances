// Tâches de l'objectif (notation sur 100). Barème facilement modifiable ici.

export type ObjectiveTask = {
  key: string;
  label: string;
  points: number;
  note?: string;
};

export const OBJECTIVE_TARGET = 100;

export const OBJECTIVE_TASKS: ObjectiveTask[] = [
  { key: 'cours1', label: 'Finir de suivre le Cours 1', points: 2.5 },
  {
    key: 'choix',
    label: 'Suivre en entier au moins un cours sur un métier de l’IA',
    points: 15,
    note: 'Au choix : Montage vidéo · Copywriting IA · Conception d’affiches & vidéos avec l’IA · Création de sites web avec l’IA. En cocher au moins un (les autres sont facultatifs).',
  },
  { key: 'cours2', label: 'Finir de suivre le Cours 2', points: 2.5 },
  { key: 'cours3', label: 'Finir de suivre le Cours 3', points: 2.5 },
  { key: 'cours4', label: 'Finir de suivre le Cours 4', points: 2.5 },
  { key: 'cours5', label: 'Finir de suivre le Cours 5', points: 2.5 },
  { key: 'cours6', label: 'Finir de suivre le Cours 6', points: 2.5 },
  { key: 'portfolio', label: 'Créer son portfolio', points: 5 },
  { key: 'contenu', label: 'Créer son premier contenu sur les réseaux', points: 5 },
  { key: 'prospects', label: 'Contacter 100 prospects à qui proposer ses services', points: 50 },
  { key: 'comeup_compte', label: 'Créer ton compte Come Up', points: 5 },
  { key: 'comeup_services', label: 'Créer au moins 2 services sur Come Up', points: 5 },
];

export function scoreFromKeys(keys: Iterable<string>): number {
  const set = keys instanceof Set ? keys : new Set(keys);
  return OBJECTIVE_TASKS.reduce((sum, t) => (set.has(t.key) ? sum + t.points : sum), 0);
}

/** Total maximum réellement atteignable avec le barème ci-dessus. */
export const OBJECTIVE_MAX = OBJECTIVE_TASKS.reduce((s, t) => s + t.points, 0);
