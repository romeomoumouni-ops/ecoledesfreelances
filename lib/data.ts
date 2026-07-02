// Types & configuration statique (pas de données fictives — tout vient de Supabase).

export type Course = {
  id: string;
  title: string;
  category: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé' | string;
  lessons: number;
  hours: number;
  rating: number;
  students: number;
  price?: number;
  instructor: string;
  color: string;
  progress?: number;
  tag?: string;
  description: string;
  thumbnail_url?: string | null;
};

export type LiveSession = {
  id: string;
  date: string;
  time: string;
  coach: string;
  theme: string;
  live?: boolean;
  meetingUrl?: string | null;
};

export type LeaderRow = {
  rank: number;
  name: string;
  courses: number;
  streak: number;
  points: number;
  badges: string[];
  color?: string;
  isYou?: boolean;
};

