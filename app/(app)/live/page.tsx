export const dynamic = 'force-dynamic';

import { PageHeader, EmptyState } from '@/components/UI';
import { getLiveSessions } from '@/lib/db';
import { IconLive, IconCalendar, IconClock, IconUsers } from '@/components/Icons';

export default async function LivePage() {
  const liveSessions = await getLiveSessions();
  return (
    <>
      <PageHeader
        title="Live"
        subtitle="Vos sessions de coaching de groupe en direct avec vos coachs."
      />

      {liveSessions.length ? (
        <div className="space-y-3">
          {liveSessions.map((s) => (
            <div
              key={s.id}
              className={`card flex flex-col gap-4 p-5 sm:flex-row sm:items-center ${
                s.live ? 'border-l-2 border-l-ink' : ''
              }`}
            >
              {/* Icône */}
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-black/[0.04] text-ink">
                <IconLive width={20} height={20} />
              </span>

              {/* Texte */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink">Coaching de groupe</h3>
                  {s.live ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                      En direct
                    </span>
                  ) : (
                    <span className="chip bg-black/[0.05] text-muted">À venir</span>
                  )}
                </div>

                <p className="mt-1 text-sm text-muted">
                  Vous avez un coaching de groupe le{' '}
                  <b className="font-semibold text-ink">{s.date}</b> à{' '}
                  <b className="font-semibold text-ink">{s.time}</b> avec le coach{' '}
                  <b className="font-semibold text-ink">{s.coach}</b>.
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  Thème : «&nbsp;<span className="text-ink">{s.theme}</span>&nbsp;»
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted sm:hidden">
                  <span className="flex items-center gap-1.5">
                    <IconCalendar width={13} height={13} /> {s.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <IconClock width={13} height={13} /> {s.time}
                  </span>
                </div>
              </div>

              {/* Action */}
              <button className={`${s.live ? 'btn-primary' : 'btn-outline'} shrink-0`}>
                {s.live ? 'Rejoindre le live' : 'Ajouter au calendrier'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          Icon={IconUsers}
          title="Aucune session prévue"
          text="Les prochaines sessions de coaching de groupe apparaîtront ici."
        />
      )}
    </>
  );
}