import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCourseById } from '@/lib/db';
import { getCourseChapters } from '@/lib/content';
import CourseBuilder from '@/components/admin/CourseBuilder';
import EditCourseForm from '@/components/admin/EditCourseForm';
import { IconChevronRight } from '@/components/Icons';

export const dynamic = 'force-dynamic';

export default async function AdminCourseBuilderPage({ params }: { params: { id: string } }) {
  const [course, chapters] = await Promise.all([
    getCourseById(params.id),
    getCourseChapters(params.id),
  ]);
  if (!course) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/cours" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <IconChevronRight width={16} height={16} className="rotate-180" /> Tous les cours
      </Link>

      <EditCourseForm course={course} />

      <div className="mt-6">
        <CourseBuilder course={{ id: course.id, title: course.title }} chapters={chapters} />
      </div>
    </div>
  );
}
