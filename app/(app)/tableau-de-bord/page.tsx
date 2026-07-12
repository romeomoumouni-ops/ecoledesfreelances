export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { PageHeader, StatCard, CourseCard, EmptyState } from '@/components/UI';
import { getCourses, getLiveSessions } from '@/lib/db';
import { getCurrentProfile, getMyTaskKeys } from '@/lib/user';
import { scoreFromKeys, OBJECTIVE_TARGET } from '@/lib/tasks';
import { IconBook, IconLive, IconTarget, IconArrowRight } from '@/components/Icons';
import IntroVideo from '@/components/IntroVideo';

export default async function DashboardPage() {
  const [profile, courses, lives, taskKeys] = await Promise.all([
    getCurrentProfile(),
    getCourses(),
    getLiveSessions(),
    getMyTaskKeys(),
  ]);

  const firstName = (profile?.full_name || 'Membre').split(' ')[0];
  const score = scoreFromKeys(taskKeys);
  const percent = Math.min(100, Math.round((score / OBJECTIVE_TARGET) * 100));
  const scoreLabel = score % 1 === 0 ? String(score) : score.toFixed(1);

  return (
    <>
      <PageHeader
        title={`Bonjour, ${firstName} 👋`}
        subtitle="Voici un aperçu de ton programme."
      />

      {/* Statistiques réelles */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Cours du programme" value={String(courses.length)} Icon={IconBook} note="Cours disponibles dans ton programme." />
        <StatCard label="Sessions live" value={String(lives.length)} Icon={IconLive} note="Coachings de groupe programmés." />
        <StatCard label="Objectif" value={`${percent}%`} Icon={IconTarget} note="Ta progression vers l'objectif (score sur 100)." />
      </div>

      {/* Vidéo de présentation de la plateforme */}
      <div className="mt-6">
        <IntroVideo />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Mes cours à suivre</h2>
              {courses.length > 0 && (
                <Link href="/mes-formations" className="text-sm font-semibold text-ink hover:underline">
                  Tout voir
                </Link>
              )}
            </div>
            {courses.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {courses.slice(0, 4).map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            ) : (
              <EmptyState
                Icon={IconBook}
                title="Aucun cours pour l'instant"
                text="Les cours de ton programme apparaîtront ici dès qu'ils seront publiés."
              />
            )}
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* La route vers ton objectif */}
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-ink">La route vers ton objectif</h3>
              <Link href="/objectif" className="text-sm font-semibold text-ink hover:underline">
                Ouvrir
              </Link>
            </div>

            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold tracking-tight text-ink">
                {scoreLabel}
                <span className="text-base font-semibold text-muted"> / {OBJECTIVE_TARGET}</span>
              </p>
              <span className="text-xl font-bold text-ink">{percent}%</span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-black/[0.07]">
              <div className="h-full rounded-full bg-ink transition-all duration-300" style={{ width: `${percent}%` }} />
            </div>

            <Link href="/objectif" className="btn-primary mt-4 w-full">
              Accomplir mes tâches
              <IconArrowRight width={18} height={18} />
            </Link>

            <p className="mt-3 text-center text-xs leading-relaxed text-muted">
              Accomplis tes tâches pour augmenter tes points. Sois honnête.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
