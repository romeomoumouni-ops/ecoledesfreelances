export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { getCourseById } from '@/lib/db';
import { getCourseChapters, getCourseModules } from '@/lib/content';
import { getCurrentProfile } from '@/lib/user';
import { signMediaMany } from '@/lib/media';
import { createClient } from '@/lib/supabase/server';
import CoursePlayer from '@/components/CoursePlayer';

export default async function CoursePlayerPage({ params }: { params: { id: string } }) {
  const [course, chapters, modules, profile] = await Promise.all([
    getCourseById(params.id),
    getCourseChapters(params.id),
    getCourseModules(params.id),
    getCurrentProfile(),
  ]);
  if (!course) notFound();
  if (!profile) redirect('/connexion');

  const supabase = createClient();
  const { data: progress } = await supabase
    .from('video_progress')
    .select('chapter_id, seconds')
    .eq('user_id', profile.id);
  const posMap = new Map<string, number>((progress ?? []).map((p) => [p.chapter_id, Number(p.seconds)]));

  // URLs vidéo signées EN UNE SEULE requête (avant : une par chapitre → page lente)
  const signed = await signMediaMany(chapters.map((ch) => ch.video_url));
  const playerChapters = chapters.map((ch) => ({
    id: ch.id,
    title: ch.title,
    description: ch.description,
    moduleId: ch.module_id,
    quiz: ch.quiz,
    videoUrl: ch.video_url ? signed.get(ch.video_url) ?? null : null,
    startAt: posMap.get(ch.id) ?? 0,
  }));

  return (
    <CoursePlayer
      course={{ id: course.id, title: course.title }}
      chapters={playerChapters}
      modules={modules.map((m) => ({ id: m.id, title: m.title }))}
      me={{ id: profile.id, name: profile.full_name, isAdmin: profile.is_admin }}
    />
  );
}
