// Données fictives (mock) — à remplacer par de vraies données plus tard.

export const currentUser = {
  name: 'Awa Diop',
  handle: '@awa',
  role: 'Étudiante — Parcours Design',
  points: 1180,
  rank: 8,
  streak: 4,
  coursesCompleted: 4,
  avatarColor: '#3b82f6',
  initials: 'AD',
};

export type Course = {
  id: string;
  title: string;
  category: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  lessons: number;
  hours: number;
  rating: number;
  students: number;
  price: number;
  instructor: string;
  color: string;
  progress?: number;
  tag?: string;
  description: string;
};

export const courses: Course[] = [
  {
    id: 'design-ui-ux',
    title: 'Devenir Designer UI/UX freelance',
    category: 'Design',
    level: 'Débutant',
    lessons: 42,
    hours: 18,
    rating: 4.9,
    students: 1280,
    price: 35000,
    instructor: 'Mariam Touré',
    color: '#3b82f6',
    progress: 68,
    tag: 'Populaire',
    description:
      'De Figma au portfolio : maîtrisez le design d\'interfaces et décrochez vos premiers clients.',
  },
  {
    id: 'dev-web',
    title: 'Développement Web — Du zéro au premier contrat',
    category: 'Développement',
    level: 'Débutant',
    lessons: 56,
    hours: 32,
    rating: 4.8,
    students: 2140,
    price: 45000,
    instructor: 'Yaya Koné',
    color: '#3f9af6',
    progress: 24,
    tag: 'Nouveau',
    description:
      'HTML, CSS, JavaScript et React. Construisez de vrais sites et lancez votre activité.',
  },
  {
    id: 'marketing-digital',
    title: 'Marketing Digital & acquisition de clients',
    category: 'Marketing',
    level: 'Intermédiaire',
    lessons: 38,
    hours: 16,
    rating: 4.7,
    students: 980,
    price: 30000,
    instructor: 'Fatou Ndiaye',
    color: '#f0568c',
    progress: 100,
    description:
      'Publicité, réseaux sociaux et tunnels de vente pour trouver des clients en continu.',
  },
  {
    id: 'redaction-web',
    title: 'Rédaction Web & Copywriting',
    category: 'Rédaction',
    level: 'Débutant',
    lessons: 28,
    hours: 12,
    rating: 4.9,
    students: 760,
    price: 25000,
    instructor: 'Awa Camara',
    color: '#23b58a',
    description:
      'Écrivez des textes qui vendent et facturez vos articles au juste prix.',
  },
  {
    id: 'montage-video',
    title: 'Montage Vidéo pour les réseaux sociaux',
    category: 'Vidéo',
    level: 'Intermédiaire',
    lessons: 34,
    hours: 20,
    rating: 4.6,
    students: 540,
    price: 38000,
    instructor: 'Ibrahim Sow',
    color: '#f5972a',
    description:
      'CapCut et Premiere Pro : créez des vidéos virales pour vos clients.',
  },
  {
    id: 'freelance-business',
    title: 'Lancer son business de freelance',
    category: 'Business',
    level: 'Débutant',
    lessons: 22,
    hours: 8,
    rating: 5.0,
    students: 1620,
    price: 20000,
    instructor: 'Mariam Touré',
    color: '#3b82f6',
    tag: 'Best-seller',
    description:
      'Statut, devis, contrats, tarifs : tout pour démarrer sereinement.',
  },
];

export const categories = [
  { name: 'Tous', icon: 'sparkle' },
  { name: 'Design', icon: 'pen' },
  { name: 'Développement', icon: 'code' },
  { name: 'Marketing', icon: 'megaphone' },
  { name: 'Rédaction', icon: 'pen' },
  { name: 'Vidéo', icon: 'camera' },
  { name: 'Business', icon: 'briefcase' },
];

export type LeaderRow = {
  rank: number;
  name: string;
  courses: number;
  streak: number;
  points: number;
  badges: string[];
  color: string;
  isYou?: boolean;
};

export const leaderboard: LeaderRow[] = [
  { rank: 1, name: 'AlexR_21', courses: 12, streak: 15, points: 1520, badges: ['Champion du mois', 'Quiz Master', '+4'], color: '#3b82f6' },
  { rank: 2, name: 'LearnWithMira', courses: 9, streak: 18, points: 1340, badges: ['Top Designer', 'Quiz Master', '+2'], color: '#f0568c' },
  { rank: 3, name: 'CodeJunkie', courses: 10, streak: 14, points: 1290, badges: ['Code Streak', 'Growth Hacker'], color: '#f5972a' },
  { rank: 4, name: 'DesignGuru', courses: 8, streak: 8, points: 1210, badges: ['Top Designer', 'Quiz Master'], color: '#23b58a' },
  { rank: 5, name: 'MathMaster', courses: 7, streak: 7, points: 1190, badges: ['Mr. Number', 'Quiz Master', '+1'], color: '#3f9af6' },
  { rank: 6, name: 'GrowthHacker', courses: 6, streak: 7, points: 1185, badges: ['Growth Hacker', 'Quiz Master'], color: '#60a5fa' },
  { rank: 7, name: 'DevWizard', courses: 5, streak: 7, points: 1182, badges: ['Code Streak', 'Quiz Master'], color: '#f0568c' },
  { rank: 8, name: 'Vous', courses: 4, streak: 4, points: 1180, badges: ['Quiz Master', 'Fast Learner'], color: '#3b82f6', isYou: true },
  { rank: 9, name: 'UIUXExplorer', courses: 4, streak: 6, points: 1150, badges: ['Top Designer', 'Quiz Master'], color: '#23b58a' },
  { rank: 10, name: 'PixelPro', courses: 4, streak: 3, points: 1120, badges: ['Top Designer'], color: '#f5972a' },
];

export const assignments = [
  { id: 'a1', title: 'Maquette d\'une page d\'accueil sur Figma', course: 'Designer UI/UX', due: 'Dans 2 jours', status: 'À rendre', points: 50 },
  { id: 'a2', title: 'Intégrer une landing page responsive', course: 'Développement Web', due: 'Dans 5 jours', status: 'À rendre', points: 80 },
  { id: 'a3', title: 'Rédiger 3 accroches publicitaires', course: 'Copywriting', due: 'Rendu', status: 'Corrigé', points: 40, grade: '18/20' },
  { id: 'a4', title: 'Plan de contenu pour Instagram', course: 'Marketing Digital', due: 'Rendu', status: 'En correction', points: 60 },
];

export const certificates = [
  { id: 'c1', title: 'Marketing Digital & acquisition de clients', date: '12 juin 2026', ref: 'EDF-2026-0481', color: '#f0568c' },
  { id: 'c2', title: 'Lancer son business de freelance', date: '28 mai 2026', ref: 'EDF-2026-0312', color: '#3b82f6' },
];

export type CurriculumLesson = {
  title: string;
  duration: string;
  done: boolean;
  current?: boolean;
  locked?: boolean;
};

export type CurriculumModule = { section: string; lessons: CurriculumLesson[] };

export const lessonCurriculum: CurriculumModule[] = [
  {
    section: 'Module 1 — Les bases du design',
    lessons: [
      { title: 'Introduction au métier de designer', duration: '6 min', done: true },
      { title: 'Les principes fondamentaux', duration: '12 min', done: true },
      { title: 'Couleur, typographie et espace', duration: '15 min', done: true, current: true },
      { title: 'Quiz — Les fondamentaux', duration: '5 min', done: false },
    ],
  },
  {
    section: 'Module 2 — Maîtriser Figma',
    lessons: [
      { title: 'Découverte de l\'interface', duration: '10 min', done: false },
      { title: 'Composants et auto-layout', duration: '18 min', done: false, locked: true },
      { title: 'Prototypage interactif', duration: '14 min', done: false, locked: true },
    ],
  },
  {
    section: 'Module 3 — Trouver ses clients',
    lessons: [
      { title: 'Construire son portfolio', duration: '11 min', done: false, locked: true },
      { title: 'Fixer ses tarifs', duration: '9 min', done: false, locked: true },
    ],
  },
];

export const communityPosts = [
  { id: 'p1', author: 'Mariam Touré', role: 'Formatrice', time: 'Il y a 2 h', color: '#3b82f6', text: 'Petit rappel : pensez à publier votre maquette du module 1 dans le canal #design pour recevoir des retours 👀', likes: 24, comments: 8, pinned: true },
  { id: 'p2', author: 'Yaya Koné', role: 'Étudiant', time: 'Il y a 4 h', color: '#3f9af6', text: 'Je viens de décrocher mon premier client en développement web grâce au module sur la prospection ! Merci à toute la communauté 🙏', likes: 56, comments: 19 },
  { id: 'p3', author: 'Fatou Ndiaye', role: 'Étudiante', time: 'Hier', color: '#f0568c', text: 'Quelqu\'un a des conseils pour facturer un client à l\'étranger ? Je débute sur ce point.', likes: 12, comments: 14 },
];

export type LiveSession = {
  id: string;
  date: string;
  time: string;
  coach: string;
  theme: string;
  live?: boolean; // true = en direct maintenant
};

// Sessions de coaching de groupe. Les coachs modifieront surtout la DATE
// depuis l'espace admin (à venir).
export const liveSessions: LiveSession[] = [
  {
    id: 'live-1',
    date: "Aujourd'hui",
    time: '18h00',
    coach: 'Mariam Touré',
    theme: 'Trouver ses premiers clients en freelance',
    live: true,
  },
  {
    id: 'live-2',
    date: '8 juillet 2026',
    time: '19h00',
    coach: 'Yaya Koné',
    theme: 'Construire un portfolio qui convertit',
  },
  {
    id: 'live-3',
    date: '15 juillet 2026',
    time: '18h30',
    coach: 'Fatou Ndiaye',
    theme: 'Fixer ses tarifs sans se brader',
  },
  {
    id: 'live-4',
    date: '22 juillet 2026',
    time: '19h00',
    coach: 'Ibrahim Sow',
    theme: 'Gérer plusieurs clients sans stress',
  },
];

export function formatPrice(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}
