import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

let _c: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_c) {
    _c = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) },
      }
    );
  }
  return _c;
}

// La bonne réponse (correct_index) n'est JAMAIS envoyée au client :
// la colonne est masquée en base et la correction passe par la RPC check_quiz.
export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
};

export type Chapter = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  module_id: string | null;
  position: number;
  quiz: QuizQuestion[];
};

export type Module = {
  id: string;
  title: string;
  position: number;
};

/** Modules d'un cours (ordonnés). */
export async function getCourseModules(courseId: string): Promise<Module[]> {
  const { data } = await sb()
    .from('modules')
    .select('id, title, position')
    .eq('course_id', courseId)
    .order('position');
  return (data ?? []).map((m) => ({ id: m.id, title: m.title, position: m.position }));
}

/** Chapitres d'un cours (ordonnés), chacun avec son quiz (sans les réponses). */
export async function getCourseChapters(courseId: string): Promise<Chapter[]> {
  const [{ data: chapters }, { data: quiz }] = await Promise.all([
    sb().from('chapters').select('*').eq('course_id', courseId).order('position'),
    sb().from('quiz_questions').select('id, chapter_id, question, options, position').order('position'),
  ]);

  const quizByChapter = new Map<string, QuizQuestion[]>();
  for (const q of quiz ?? []) {
    const arr = quizByChapter.get(q.chapter_id) ?? [];
    arr.push({
      id: q.id,
      question: q.question,
      options: Array.isArray(q.options) ? q.options : [],
    });
    quizByChapter.set(q.chapter_id, arr);
  }

  return (chapters ?? []).map((ch) => ({
    id: ch.id,
    title: ch.title,
    description: ch.description,
    video_url: ch.video_url,
    module_id: ch.module_id ?? null,
    position: ch.position ?? 0,
    quiz: quizByChapter.get(ch.id) ?? [],
  }));
}
