import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCourseById } from '@/lib/db';
import { getCourseChapters, getCourseModules } from '@/lib/content';
import { createClient } from '@/lib/supabase/server';
import CourseBuilder from '@/components/admin/CourseBuilder';
import EditCourseForm from '@/components/admin/EditCourseForm';
import { IconChevronRight } from '@/components/Icons';

export const dynamic = 'force-dynamic';

export default async function AdminCourseBuilderPage({ params }: { params: { id: string } }) {
  const [course, chapters, modules] = await Promise.all([
    getCourseById(params.id),
    getCourseChapters(params.id),
    getCourseModules(params.id),
  ]);
  if (!course) notFound();

  // Chapitres dont le fichier vidéo a disparu du stockage (à re-téléverser)
  const supabase = createClient();
  const { data: missing } = await supabase.rpc('admin_missing_chapter_videos', { p_course: params.id });
  const missingVideos = ((missing ?? []) as unknown[]).map(String);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/cours" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <IconChevronRight width={16} height={16} className="rotate-180" /> Tous les cours
      </Link>

      <EditCourseForm course={course} />

      <div className="mt-6">
        <CourseBuilder
          course={{ id: course.id, title: course.title }}
          chapters={chapters}
          modules={modules}
          missingVideos={missingVideos}
        />
      </div>
    </div>
  );
}
