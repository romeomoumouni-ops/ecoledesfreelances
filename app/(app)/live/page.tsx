export const dynamic = 'force-dynamic';

import { PageHeader, EmptyState } from '@/components/UI';
import { getLiveSessions, getLiveReplays } from '@/lib/db';
import { IconLive, IconUsers, IconPlayFill, IconArrowRight } from '@/components/Icons';

// Une session reste affichée jusqu'à ~4 h après son début, puis disparaît
// toute seule (les coachs n'ont plus à faire le ménage).
const HIDE_AFTER_MS = 4 * 60 * 60 * 1000;

export default async function LivePage() {
  const [allSessions, replays] = await Promise.all([getLiveSessions(), getLiveReplays()]);
  const now = Date.now();
  const liveSessions = allSessions.filter(
    (s) => !s.startsAt || new Date(s.startsAt).getTime() + HIDE_AFTER_MS > now
  );

  return (
    <>
      <PageHeader
        title="Live & Replay"
        subtitle="Tes sessions de coaching en direct — et les replays si tu en as raté une."
      />

      {liveSessions.length ? (
        <div className="space-y-3">
          {liveSessions.map((s) => (
            <div
              key={s.id}
              className={`card flex flex-col gap-4 p-5 transition hover:border-[#e0e0de] hover:shadow-soft sm:flex-row sm:items-center ${
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
                  Tu as un coaching de groupe le{' '}
                  <b className="font-semibold text-ink">{s.date}</b> à{' '}
                  <b className="font-semibold text-ink">{s.time}</b> avec le coach{' '}
                  <b className="font-semibold text-ink">{s.coach}</b>.
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  Thème : «&nbsp;<span className="text-ink">{s.theme}</span>&nbsp;»
                </p>
              </div>

              {/* Action : lien réel de la session (défini par les coachs) */}
              {s.meetingUrl ? (
                <a
                  href={s.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${s.live ? 'btn-primary' : 'btn-outline'} shrink-0`}
                >
                  {s.live ? 'Rejoindre le live' : 'Lien de la session'}
                </a>
              ) : (
                <span className="shrink-0 text-xs text-muted">
                  Le lien sera partagé avant la session.
                </span>
              )}
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

      {/* Replays des lives passés */}
      <div className="mt-10">
        <h2 className="mb-1 text-lg font-bold text-ink">Replays</h2>
        <p className="mb-4 text-sm text-muted">Tu as raté un live ? Regarde le replay quand tu veux.</p>
        {replays.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {replays.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card group flex items-center gap-4 p-5 transition hover:border-[#e0e0de] hover:shadow-soft"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white transition group-hover:scale-105">
                  <IconPlayFill width={16} height={16} className="ml-0.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{r.title}</span>
                  <span className="block text-xs text-muted">
                    {r.coach ? `${r.coach} · ` : ''}
                    {new Date(r.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-ink transition group-hover:gap-1.5">
                  Regarder <IconArrowRight width={15} height={15} />
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-muted">
            Aucun replay pour l&apos;instant — ils apparaîtront ici après les sessions.
          </div>
        )}
      </div>
    </>
  );
}
