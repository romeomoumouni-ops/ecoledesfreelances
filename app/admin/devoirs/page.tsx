import { createClient } from '@/lib/supabase/server';
import { createAssignment, deleteAssignment } from '@/lib/admin-actions';
import { IconClipboard, IconX } from '@/components/Icons';

export const dynamic = 'force-dynamic';

export default async function AdminDevoirsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('assignments')
    .select('*, assignment_submissions(count)')
    .order('sort');
  const assignments = data ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-4 text-xl font-bold text-ink">Devoirs ({assignments.length})</h1>
        {assignments.length ? (
          <div className="space-y-3">
            {assignments.map((a) => (
              <div key={a.id} className="card flex items-center gap-4 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/[0.04] text-ink">
                  <IconClipboard width={19} height={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{a.title}</p>
                  <p className="truncate text-xs text-muted">
                    {[a.course, a.due, a.points ? `${a.points} pts` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-muted">
                  {a.assignment_submissions?.[0]?.count ?? 0} rendu(s)
                </span>
                <form action={deleteAssignment.bind(null, a.id)}>
                  <button
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Supprimer"
                    title="Supprimer le devoir"
                  >
                    <IconX width={18} height={18} />
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-muted">
            Aucun devoir. Créez-en un avec le formulaire — il apparaîtra aussitôt chez les élèves.
          </div>
        )}
      </div>

      <div>
        <div className="card p-5 lg:sticky lg:top-[150px]">
          <h2 className="mb-4 font-bold text-ink">Créer un devoir</h2>
          <form action={createAssignment} className="space-y-3">
            <div>
              <label className="label">Titre *</label>
              <input name="title" required className="input" placeholder="Ex. Créer une maquette Figma" />
            </div>
            <div>
              <label className="label">Cours lié (optionnel)</label>
              <input name="course" className="input" placeholder="Ex. Le Mindset d'un freelance" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Échéance</label>
                <input name="due" className="input" placeholder="Ex. Avant le 15 juillet" />
              </div>
              <div>
                <label className="label">Points</label>
                <input name="points" type="number" min="0" className="input" placeholder="0" />
              </div>
            </div>
            <button className="btn-primary w-full">Publier le devoir</button>
          </form>
        </div>
      </div>
    </div>
  );
}
