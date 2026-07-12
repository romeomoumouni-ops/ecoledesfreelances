import { getLiveSessions, getLiveReplays } from '@/lib/db';
import { createLive, deleteLive, createReplay, deleteReplay } from '@/lib/admin-actions';
import LiveTestButton from '@/components/admin/LiveTestButton';
import { IconLive, IconX, IconPlayFill } from '@/components/Icons';

export const dynamic = 'force-dynamic';

// Une session est masquée côté élèves ~4 h après son début.
const HIDE_AFTER_MS = 4 * 60 * 60 * 1000;

export default async function AdminLivePage() {
  const [lives, replays] = await Promise.all([getLiveSessions(), getLiveReplays()]);
  const now = Date.now();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        {/* Sessions programmées */}
        <div>
          <h1 className="mb-1 text-xl font-bold text-ink">Sessions live ({lives.length})</h1>
          <p className="mb-4 text-xs text-muted">
            Une session disparaît automatiquement de l&apos;app des élèves 4 h après son heure de début.
          </p>
          {lives.length ? (
            <div className="space-y-3">
              {lives.map((s) => {
                const finished = s.startsAt ? new Date(s.startsAt).getTime() + HIDE_AFTER_MS < now : false;
                return (
                  <div key={s.id} className={`card flex items-center gap-4 p-4 ${finished ? 'opacity-60' : ''}`}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/[0.04] text-ink">
                      <IconLive width={19} height={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">
                        {s.theme} {s.live && <span className="text-xs font-normal text-red-600">· en direct</span>}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {s.date} · {s.time} · {s.coach}
                        {finished && ' · terminé (masqué chez les élèves)'}
                      </p>
                    </div>
                    <form action={deleteLive.bind(null, s.id)}>
                      <button
                        className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Supprimer"
                        title="Supprimer la session"
                      >
                        <IconX width={18} height={18} />
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card p-8 text-center text-sm text-muted">
              Aucune session programmée. Ajoutez-en une avec le formulaire.
            </div>
          )}
        </div>

        {/* Replays publiés */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-ink">Replays publiés ({replays.length})</h2>
          {replays.length ? (
            <div className="space-y-3">
              {replays.map((r) => (
                <div key={r.id} className="card flex items-center gap-4 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/[0.04] text-ink">
                    <IconPlayFill width={16} height={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{r.title}</p>
                    <p className="truncate text-xs text-muted">
                      {r.coach ? `${r.coach} · ` : ''}
                      {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                  <form action={deleteReplay.bind(null, r.id)}>
                    <button
                      className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Supprimer"
                      title="Supprimer le replay"
                    >
                      <IconX width={18} height={18} />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-sm text-muted">
              Aucun replay publié pour l&apos;instant.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Programmer une session */}
        <div className="card p-5">
          <h2 className="mb-4 font-bold text-ink">Programmer une session</h2>
          <form action={createLive} className="space-y-3">
            <div>
              <label className="label">Thème *</label>
              <input name="theme" required className="input" placeholder="Ex. Trouver ses premiers clients" />
            </div>
            <div>
              <label className="label">Coach</label>
              <input name="coach" className="input" placeholder="Nom du coach" />
            </div>
            <div>
              <label className="label">Date et heure * (heure du Bénin, GMT+1)</label>
              <input name="starts_at" type="datetime-local" required className="input" />
              <p className="mt-1 text-[11px] text-muted">
                La session disparaîtra automatiquement de l&apos;app 4 h après cette heure.
              </p>
            </div>
            <div>
              <label className="label">Lien de la session (Zoom, Meet, YouTube…)</label>
              <input name="meeting_url" type="url" className="input" placeholder="https://…" />
            </div>
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input name="is_live" type="checkbox" className="h-4 w-4 accent-ink" />
              En direct maintenant
            </label>
            <button className="btn-primary w-full">Programmer</button>
          </form>

          <LiveTestButton />
        </div>

        {/* Publier un replay */}
        <div className="card p-5">
          <h2 className="mb-1 font-bold text-ink">Publier un replay</h2>
          <p className="mb-4 text-xs text-muted">
            Le replay apparaît dans l&apos;onglet « Live &amp; Replay » des élèves.
          </p>
          <form action={createReplay} className="space-y-3">
            <div>
              <label className="label">Titre *</label>
              <input name="title" required className="input" placeholder="Ex. Replay — Trouver ses premiers clients" />
            </div>
            <div>
              <label className="label">Coach</label>
              <input name="coach" className="input" placeholder="Nom du coach" />
            </div>
            <div>
              <label className="label">Lien du replay * (YouTube, Drive…)</label>
              <input name="url" type="url" required className="input" placeholder="https://…" />
            </div>
            <button className="btn-primary w-full">Publier le replay</button>
          </form>
        </div>
      </div>
    </div>
  );
}
