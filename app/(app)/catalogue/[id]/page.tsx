export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCourseById } from '@/lib/db';
import { getCourseChapters } from '@/lib/content';
import { Badge } from '@/components/UI';
import Avatar from '@/components/Avatar';
import {
  IconClock,
  IconBook,
  IconPlayFill,
  IconChevronRight,
  IconArrowRight,
} from '@/components/Icons';

export default async function CourseDetailPage({ params }: { params: { id: string } }) {
  const [course, chapters] = await Promise.all([
    getCourseById(params.id),
    getCourseChapters(params.id),
  ]);
  if (!course) notFound();

  return (
    <>
      <Link href="/mes-formations" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <IconChevronRight width={16} height={16} className="rotate-180" /> Mes cours
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Hero */}
          <div className="card overflow-hidden">
            <div className="relative aspect-[16/7] w-full border-b border-line bg-black/[0.02]">
              {course.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.thumbnail_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-muted">
                  <IconBook width={40} height={40} />
                </span>
              )}
            </div>
            <div className="p-6">
              {course.tag && (
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge variant="solid">{course.tag}</Badge>
                </div>
              )}
              <h1 className="text-2xl font-bold tracking-tight text-ink">{course.title}</h1>
              {course.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted">{course.description}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <IconBook width={16} height={16} /> {chapters.length || course.lessons} chapitre(s)
                </span>
                {course.hours > 0 && (
                  <span className="flex items-center gap-1.5">
                    <IconClock width={16} height={16} /> {course.hours} h de contenu
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Programme réel */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-bold text-ink">Programme du cours</h2>
            {chapters.length ? (
              <div className="overflow-hidden rounded-lg border border-line">
                {chapters.map((ch, i) => (
                  <div key={ch.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/[0.05] text-xs font-bold text-muted">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-ink">{ch.title}</span>
                    {ch.video_url && <IconPlayFill width={12} height={12} className="text-muted" />}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Les chapitres seront publiés prochainement.</p>
            )}
          </div>
        </div>

        {/* Carte d'accès */}
        <div className="space-y-6">
          <div className="card p-6 lg:sticky lg:top-[88px]">
            <p className="text-lg font-bold text-ink">Inclus dans votre programme</p>
            <p className="mt-1 text-sm text-muted">Accès complet à ce cours</p>
            <Link href={`/cours/${course.id}`} className="btn-primary mt-5 w-full">
              Commencer le cours
              <IconArrowRight width={18} height={18} />
            </Link>
          </div>

          {course.instructor && (
            <div className="card p-6">
              <p className="mb-3 text-sm font-bold text-ink">Votre formateur·rice</p>
              <div className="flex items-center gap-3">
                <Avatar initials={course.instructor.split(' ').map((n) => n[0]).join('').slice(0, 2)} size={48} />
                <div>
                  <p className="font-bold text-ink">{course.instructor}</p>
                  <p className="text-xs text-muted">Formateur · Freelance</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
