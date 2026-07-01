import { notFound } from 'next/navigation';
import { getCourseById } from '@/lib/db';
import { getCourseChapters } from '@/lib/content';
import CourseBuilder from '@/components/admin/CourseBuilder';

export const dynamic = 'force-dynamic';

export default async function AdminCourseBuilderPage({ params }: { params: { id: string } }) {
  const [course, chapters] = await Promise.all([
    getCourseById(params.id),
    getCourseChapters(params.id),
  ]);
  if (!course) notFound();
  return <CourseBuilder course={{ id: course.id, title: course.title }} chapters={chapters} />;
}
