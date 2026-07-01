import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

let _c: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_c) {
    _c = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _c;
}

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
};

export type Chapter = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  quiz: QuizQuestion[];
};

/** Chapitres d'un cours (ordonnés), chacun avec son quiz. */
export async function getCourseChapters(courseId: string): Promise<Chapter[]> {
  const [{ data: chapters }, { data: quiz }] = await Promise.all([
    sb().from('chapters').select('*').eq('course_id', courseId).order('position'),
    sb().from('quiz_questions').select('*').order('position'),
  ]);

  const quizByChapter = new Map<string, QuizQuestion[]>();
  for (const q of quiz ?? []) {
    const arr = quizByChapter.get(q.chapter_id) ?? [];
    arr.push({
      id: q.id,
      question: q.question,
      options: Array.isArray(q.options) ? q.options : [],
      correct_index: q.correct_index ?? 0,
    });
    quizByChapter.set(q.chapter_id, arr);
  }

  return (chapters ?? []).map((ch) => ({
    id: ch.id,
    title: ch.title,
    description: ch.description,
    video_url: ch.video_url,
    quiz: quizByChapter.get(ch.id) ?? [],
  }));
}
