import { notFound } from 'next/navigation';
import { getCourseById } from '@/lib/db';
import { getCourseTree } from '@/lib/content';
import CourseBuilder from '@/components/admin/CourseBuilder';

export const dynamic = 'force-dynamic';

export default async function AdminCourseBuilderPage({ params }: { params: { id: string } }) {
  const [course, tree] = await Promise.all([getCourseById(params.id), getCourseTree(params.id)]);
  if (!course) notFound();
  return <CourseBuilder course={{ id: course.id, title: course.title }} tree={tree} />;
}
