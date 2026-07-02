import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Course, LiveSession, LeaderRow } from '@/lib/data';
import { signMedia } from '@/lib/media';

// Client simple (lecture de contenu public via RLS), créé à la demande pour ne
// jamais échouer à l'import (ex. build sans variables d'env).
let _client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!_client) {
    _client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        // Jamais de cache : les données doivent toujours être fraîches.
        global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) },
      }
    );
  }
  return _client;
}

export type Assignment = {
  id: string;
  title: string;
  course: string;
  due: string;
  status: string;
  points: number;
  grade?: string | null;
};

export async function getCourses(): Promise<Course[]> {
  const { data } = await db().from('courses').select('*').order('sort');
  return Promise.all(
    (data ?? []).map(async (c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      level: c.level,
      lessons: Number(c.lessons),
      hours: Number(c.hours),
      rating: Number(c.rating),
      students: Number(c.students),
      price: 0,
      instructor: c.instructor,
      color: c.color ?? '#1d1d1f',
      progress: c.progress === null ? undefined : Number(c.progress),
      tag: c.tag ?? undefined,
      description: c.description,
      thumbnail_url: await signMedia(c.thumbnail_url),
    }))
  );
}

export async function getCourseById(id: string): Promise<Course | null> {
  const courses = await getCourses();
  return courses.find((c) => c.id === id) ?? null;
}

export async function getLiveSessions(): Promise<LiveSession[]> {
  const { data } = await db().from('live_sessions').select('*').order('sort');
  return (data ?? []).map((s) => ({
    id: s.id,
    date: s.date_label,
    time: s.time_label,
    coach: s.coach,
    theme: s.theme,
    live: s.is_live ?? false,
  }));
}

export async function getAssignments(): Promise<Assignment[]> {
  const { data } = await db().from('assignments').select('*').order('sort');
  return (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    course: a.course,
    due: a.due,
    status: a.status,
    points: Number(a.points),
    grade: a.grade,
  }));
}

export async function getLeaderboard(): Promise<LeaderRow[]> {
  const { data } = await db().from('leaderboard').select('*').order('rank');
  return (data ?? []).map((r) => ({
    rank: Number(r.rank),
    name: r.name,
    courses: Number(r.courses),
    streak: Number(r.streak),
    points: Number(r.points),
    badges: r.badges ?? [],
    color: '#1d1d1f',
    isYou: r.is_you ?? false,
  }));
}

