export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { getCourseById } from '@/lib/db';
import { getCourseTree } from '@/lib/content';
import { getCurrentProfile } from '@/lib/user';
import CoursePlayer from '@/components/CoursePlayer';

export default async function CoursePlayerPage({ params }: { params: { id: string } }) {
  const [course, tree, profile] = await Promise.all([
    getCourseById(params.id),
    getCourseTree(params.id),
    getCurrentProfile(),
  ]);
  if (!course) notFound();
  if (!profile) redirect('/connexion');

  return (
    <CoursePlayer
      course={{ id: course.id, title: course.title }}
      tree={tree}
      me={{ id: profile.id, name: profile.full_name }}
    />
  );
}
