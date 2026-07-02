export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { getCourseById } from '@/lib/db';
import { getCourseChapters } from '@/lib/content';
import { getCurrentProfile } from '@/lib/user';
import { signMedia } from '@/lib/media';
import { createClient } from '@/lib/supabase/server';
import CoursePlayer from '@/components/CoursePlayer';

export default async function CoursePlayerPage({ params }: { params: { id: string } }) {
  const [course, chapters, profile] = await Promise.all([
    getCourseById(params.id),
    getCourseChapters(params.id),
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

  // URLs vidéo signées (temporaires) + position de reprise
  const playerChapters = await Promise.all(
    chapters.map(async (ch) => ({
      id: ch.id,
      title: ch.title,
      description: ch.description,
      quiz: ch.quiz,
      videoUrl: await signMedia(ch.video_url),
      startAt: posMap.get(ch.id) ?? 0,
    }))
  );

  return (
    <CoursePlayer
      course={{ id: course.id, title: course.title }}
      chapters={playerChapters}
      me={{ id: profile.id, name: profile.full_name, isAdmin: profile.is_admin }}
    />
  );
}
