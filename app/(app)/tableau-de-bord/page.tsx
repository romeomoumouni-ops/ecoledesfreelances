import Link from 'next/link';
import { PageHeader, StatCard, CourseCard, ProgressBar, Badge } from '@/components/UI';
import Avatar from '@/components/Avatar';
import { currentUser } from '@/lib/data';
import { getCourses, getLeaderboard, getAssignments } from '@/lib/db';
import {
  IconBook,
  IconCertificate,
  IconFlame,
  IconTrophy,
  IconArrowRight,
  IconClock,
  IconPlayFill,
  IconClipboard,
} from '@/components/Icons';

export default async function DashboardPage() {
  const [courses, leaderboard, assignments] = await Promise.all([
    getCourses(),
    getLeaderboard(),
    getAssignments(),
  ]);
  const inProgress = courses.filter((c) => c.progress !== undefined && c.progress < 100);
  const continueCourse = inProgress[0];
  const top3 = leaderboard.slice(0, 3);
  const upcoming = assignments.filter((a) => a.status === 'À rendre').slice(0, 3);

  return (
    <>
      <PageHeader
        title={`Bonjour, ${currentUser.name.split(' ')[0]} 👋`}
        subtitle="Voici votre progression d'aujourd'hui. Continuez sur votre lancée !"
      />

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Cours en cours"
          value="2"
          Icon={IconBook}
          note="Cours commencés mais pas encore terminés."
        />
        <StatCard
          label="Cours terminés"
          value={String(currentUser.coursesCompleted)}
          Icon={IconCertificate}
          note="Cours complétés à 100 %."
        />
        <StatCard
          label="Jours d'affilée"
          value={`${currentUser.streak} jours`}
          Icon={IconFlame}
          note="Jours consécutifs où vous êtes actif. Un jour manqué remet à zéro."
        />
        <StatCard
          label="Classement"
          value={`#${currentUser.rank}`}
          Icon={IconTrophy}
          note="Votre position parmi les élèves selon vos points."
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Reprendre la formation */}
          {continueCourse && (
            <div className="card overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className="relative flex min-h-[160px] w-full items-center justify-center overflow-hidden border-b border-line bg-black/[0.02] sm:w-56 sm:border-b-0 sm:border-r">
                  <span aria-hidden className="pointer-events-none absolute -bottom-5 -left-4 text-black/[0.05]">
                    <IconBook width={120} height={120} />
                  </span>
                  <span className="relative grid h-14 w-14 place-items-center rounded-full border border-line bg-white text-ink shadow-card">
                    <IconPlayFill width={20} height={20} />
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <Badge color={continueCourse.color}>Reprendre la formation</Badge>
                  <h3 className="mt-2 text-lg font-bold text-ink">{continueCourse.title}</h3>
                  <p className="mt-1 text-sm text-muted">
                    Module 1 — Couleur, typographie et espace · {continueCourse.hours} h au total
                  </p>
                  <div className="mt-auto pt-4">
                    <div className="mb-1.5 flex justify-between text-xs font-semibold">
                      <span className="text-muted">Progression</span>
                      <span className="text-ink">{continueCourse.progress}%</span>
                    </div>
                    <ProgressBar value={continueCourse.progress!} color={continueCourse.color} />
                    <Link href="/lecon" className="btn-primary mt-4 w-full sm:w-auto">
                      Continuer la leçon
                      <IconArrowRight width={18} height={18} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mes formations en cours */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Mes cours à suivre</h2>
              <Link href="/mes-formations" className="text-sm font-bold text-ink hover:underline">
                Tout voir
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {inProgress.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Bannière motivation */}
          <div className="card p-6">
            <h3 className="text-base font-semibold leading-snug text-ink">
              Vous êtes plus proche que vous ne le pensez
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Plus que <b className="font-semibold text-ink">40 points</b> pour entrer
              dans le Top 5. Terminez une leçon ou maintenez votre série.
            </p>
            <Link href="/lecon" className="btn-primary mt-4">
              Continuer à apprendre
            </Link>
          </div>

          {/* Top 3 classement */}
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-ink">Top du classement</h3>
              <Link href="/classement" className="text-sm font-bold text-ink hover:underline">
                Voir tout
              </Link>
            </div>
            <div className="space-y-3">
              {top3.map((row) => (
                <div key={row.rank} className="flex items-center gap-3">
                  <span className="w-5 text-center text-sm font-bold text-muted">
                    {row.rank}
                  </span>
                  <Avatar initials={row.name.slice(0, 2).toUpperCase()} color={row.color} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{row.name}</p>
                    <p className="text-xs text-muted">{row.courses} formations</p>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-bold text-ink">
                    {row.points}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Devoirs à venir */}
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-ink">Devoirs à rendre</h3>
              <Link href="/devoirs" className="text-sm font-bold text-ink hover:underline">
                Voir tout
              </Link>
            </div>
            <div className="space-y-3">
              {upcoming.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
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
          </div>
        </div>
      </div>
    </>
  );
}
