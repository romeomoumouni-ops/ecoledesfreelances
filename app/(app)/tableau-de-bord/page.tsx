export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { PageHeader, StatCard, CourseCard, EmptyState } from '@/components/UI';
import Avatar from '@/components/Avatar';
import { getCourses, getLeaderboard, getAssignments, getLiveSessions } from '@/lib/db';
import { getCurrentProfile } from '@/lib/user';
import {
  IconBook,
  IconLive,
  IconClipboard,
  IconFlame,
  IconClock,
  IconTrophy,
} from '@/components/Icons';

export default async function DashboardPage() {
  const [profile, courses, leaderboard, assignments, lives] = await Promise.all([
    getCurrentProfile(),
    getCourses(),
    getLeaderboard(),
    getAssignments(),
    getLiveSessions(),
  ]);

  const firstName = (profile?.full_name || 'Membre').split(' ')[0];
  const toDo = assignments.filter((a) => a.status === 'À rendre');
  const top3 = leaderboard.slice(0, 3);

  return (
    <>
      <PageHeader
        title={`Bonjour, ${firstName} 👋`}
        subtitle="Voici un aperçu de votre programme."
      />

      {/* Statistiques réelles */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Cours du programme" value={String(courses.length)} Icon={IconBook} note="Cours disponibles dans votre programme." />
        <StatCard label="Sessions live à venir" value={String(lives.length)} Icon={IconLive} note="Coachings de groupe programmés." />
        <StatCard label="Devoirs à rendre" value={String(toDo.length)} Icon={IconClipboard} note="Exercices en attente de votre rendu." />
        <StatCard label="Jours d'affilée" value={`${profile?.streak ?? 0}`} Icon={IconFlame} note="Jours consécutifs d'activité." />
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
                text="Les cours de votre programme apparaîtront ici dès qu'ils seront publiés."
              />
            )}
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Classement */}
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-ink">Top du classement</h3>
              {top3.length > 0 && (
                <Link href="/classement" className="text-sm font-semibold text-ink hover:underline">
                  Voir tout
                </Link>
              )}
            </div>
            {top3.length ? (
              <div className="space-y-3">
                {top3.map((row) => (
                  <div key={row.rank} className="flex items-center gap-3">
                    <span className="w-5 text-center text-sm font-bold text-muted">{row.rank}</span>
                    <Avatar initials={row.name.slice(0, 2).toUpperCase()} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{row.name}</p>
                      <p className="text-xs text-muted">{row.courses} cours</p>
                    </div>
                    <span className="text-sm font-bold text-ink">{row.points}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <IconTrophy width={26} height={26} className="text-muted" />
                <p className="mt-2 text-sm text-muted">Le classement démarrera avec l'activité des élèves.</p>
              </div>
            )}
          </div>

          {/* Devoirs à rendre */}
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-ink">Devoirs à rendre</h3>
              {toDo.length > 0 && (
                <Link href="/devoirs" className="text-sm font-semibold text-ink hover:underline">
                  Voir tout
                </Link>
              )}
            </div>
            {toDo.length ? (
              <div className="space-y-3">
                {toDo.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-lg border border-line p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/[0.04] text-ink">
                      <IconClipboard width={18} height={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{a.title}</p>
                      <p className="flex items-center gap-1 text-xs text-muted">
                        <IconClock width={13} height={13} /> {a.due}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted">Aucun devoir à rendre pour le moment.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
