export const dynamic = 'force-dynamic';

import { PageHeader, Badge, EmptyState } from '@/components/UI';
import { getAssignments } from '@/lib/db';
import { IconClipboard, IconClock, IconArrowRight } from '@/components/Icons';

export default async function DevoirsPage() {
  const assignments = await getAssignments();
  const toDo = assignments.filter((a) => a.status === 'À rendre');

  return (
    <>
      <PageHeader
        title="Exercices à rendre"
        subtitle="Mettez en pratique ce que vous apprenez et rendez vos exercices en cours."
      />

      {toDo.length ? (
        <div className="space-y-3">
          {toDo.map((a) => (
            <div
              key={a.id}
              className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center bg-black/[0.04] text-ink">
                <IconClipboard width={22} height={22} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-ink">{a.title}</h3>
                  <Badge color="#f5972a">À rendre</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {a.course} ·{' '}
                  <span className="inline-flex items-center gap-1">
                    <IconClock width={13} height={13} /> {a.due}
                  </span>{' '}
                  · {a.points} pts
                </p>
              </div>

              <button className="btn-primary shrink-0">
                Rendre l&apos;exercice
                <IconArrowRight width={18} height={18} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          Icon={IconClipboard}
          title="Aucun exercice à rendre"
          text="Vous êtes à jour ! De nouveaux exercices apparaîtront ici au fil de votre progression."
        />
      )}
    </>
  );
}