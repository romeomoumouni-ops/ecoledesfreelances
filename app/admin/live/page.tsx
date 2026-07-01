import { getLiveSessions } from '@/lib/db';
import { createLive, deleteLive } from '@/lib/admin-actions';
import { IconLive, IconX } from '@/components/Icons';

export const dynamic = 'force-dynamic';

export default async function AdminLivePage() {
  const lives = await getLiveSessions();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-4 text-xl font-bold text-ink">Sessions live ({lives.length})</h1>
        {lives.length ? (
          <div className="space-y-3">
            {lives.map((s) => (
              <div key={s.id} className="card flex items-center gap-4 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/[0.04] text-ink">
                  <IconLive width={19} height={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">
                    {s.theme} {s.live && <span className="text-xs font-normal text-red-600">· en direct</span>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {s.date} · {s.time} · {s.coach}
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
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-muted">
            Aucune session programmée. Ajoutez-en une avec le formulaire.
          </div>
        )}
      </div>

      <div>
        <div className="card sticky top-[150px] p-5">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input name="date_label" className="input" placeholder="Ex. 8 juillet 2026" />
              </div>
              <div>
                <label className="label">Heure</label>
                <input name="time_label" className="input" placeholder="Ex. 19h00" />
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input name="is_live" type="checkbox" className="h-4 w-4 accent-ink" />
              En direct maintenant
            </label>
            <button className="btn-primary w-full">Programmer</button>
          </form>
        </div>
      </div>
    </div>
  );
}
