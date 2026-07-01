export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCourseById } from '@/lib/db';
import { Badge, ProgressBar } from '@/components/UI';
import Avatar from '@/components/Avatar';
import {
  IconStarFill,
  IconClock,
  IconBook,
  IconUsers,
  IconCheck,
  IconPlayFill,
  IconChevronRight,
  IconTarget,
  IconArrowRight,
} from '@/components/Icons';

export default async function CourseDetailPage({ params }: { params: { id: string } }) {
  const course = await getCourseById(params.id);
  if (!course) notFound();

  const objectives = [
    'Maîtriser les outils professionnels du métier',
    'Construire un portfolio qui attire les clients',
    'Fixer ses tarifs et rédiger des devis',
    'Décrocher ses premiers contrats en freelance',
  ];

  return (
    <>
      <Link href="/catalogue" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <IconChevronRight width={16} height={16} className="rotate-180" /> Retour au catalogue
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Hero */}
          <div className="card overflow-hidden">
            <div className="relative flex h-52 items-center justify-center overflow-hidden border-b border-line bg-black/[0.02]">
              <span aria-hidden className="pointer-events-none absolute -right-6 -top-8 text-black/[0.05]">
                <IconBook width={200} height={200} />
              </span>
              <span className="relative grid h-16 w-16 place-items-center rounded-full border border-line bg-white text-ink shadow-card">
                <IconPlayFill width={24} height={24} />
              </span>
            </div>
            <div className="p-6">
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge color={course.color}>{course.category}</Badge>
                <Badge variant="outline">{course.level}</Badge>
                {course.tag && <Badge variant="solid" color="#171522">{course.tag}</Badge>}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">{course.title}</h1>
              <p className="mt-2 text-sm text-muted">{course.description}</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span className="flex items-center gap-1.5 font-semibold text-ink">
                  <IconStarFill width={16} height={16} className="text-muted" />
                  {course.rating.toFixed(1)}
                </span>
                <span className="flex items-center gap-1.5 text-muted">
                  <IconUsers width={16} height={16} /> {course.students.toLocaleString('fr-FR')} étudiants
                </span>
                <span className="flex items-center gap-1.5 text-muted">
                  <IconBook width={16} height={16} /> {course.lessons} leçons
                </span>
                <span className="flex items-center gap-1.5 text-muted">
                  <IconClock width={16} height={16} /> {course.hours} h de contenu
                </span>
              </div>
            </div>
          </div>

          {/* Ce que vous allez apprendre */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-bold text-ink">Ce que vous allez apprendre</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {objectives.map((o) => (
                <div key={o} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-black/[0.06] text-ink">
                    <IconCheck width={13} height={13} />
                  </span>
                  <span className="text-sm text-ink">{o}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Programme */}
          <div className="card p-6">
            <h2 className="mb-2 text-lg font-bold text-ink">Programme de la formation</h2>
            <p className="text-sm text-muted">
              Ce cours comporte <b className="text-ink">{course.lessons} leçons</b> pour{' '}
              <b className="text-ink">{course.hours} h</b> de contenu. Le détail des leçons
              sera disponible ici prochainement.
            </p>
          </div>
        </div>

        {/* Carte d'inscription (sticky) */}
        <div className="space-y-6">
          <div className="card sticky top-[88px] p-6">
            <p className="text-lg font-bold text-ink">Inclus dans votre programme</p>
            <p className="mt-1 text-sm text-muted">Accès complet à cette formation</p>

            {course.progress !== undefined ? (
              <>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs font-semibold">
                    <span className="text-muted">Votre progression</span>
                    <span className="text-ink">{course.progress}%</span>
                  </div>
                  <ProgressBar value={course.progress} color={course.color} />
                </div>
                <Link href={`/cours/${course.id}`} className="btn-primary mt-5 w-full">
                  Continuer la formation
                  <IconArrowRight width={18} height={18} />
                </Link>
              </>
            ) : (
              <Link href={`/cours/${course.id}`} className="btn-primary mt-5 w-full">
                Commencer la formation
                <IconArrowRight width={18} height={18} />
              </Link>
            )}
            <button className="btn-outline mt-2 w-full">Ajouter à mes favoris</button>

            <div className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
              {[
                { Icon: IconBook, t: `${course.lessons} leçons à la demande` },
                { Icon: IconClock, t: `${course.hours} heures de vidéo` },
                { Icon: IconTarget, t: 'Exercices pratiques corrigés' },
              ].map(({ Icon, t }) => (
                <div key={t} className="flex items-center gap-3 text-muted">
                  <Icon width={18} height={18} />
                  <span className="text-ink">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Formateur */}
          <div className="card p-6">
            <p className="mb-3 text-sm font-bold text-ink">Votre formateur·rice</p>
            <div className="flex items-center gap-3">
              <Avatar initials={course.instructor.split(' ').map((n) => n[0]).join('')} color={course.color} size={48} />
              <div>
                <p className="font-bold text-ink">{course.instructor}</p>
                <p className="text-xs text-muted">Expert·e {course.category} · Freelance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
