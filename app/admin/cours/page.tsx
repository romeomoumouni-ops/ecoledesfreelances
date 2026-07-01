import Link from 'next/link';
import { getCourses } from '@/lib/db';
import { createCourse, deleteCourse } from '@/lib/admin-actions';
import { IconBook, IconX, IconChevronRight } from '@/components/Icons';

export const dynamic = 'force-dynamic';

export default async function AdminCoursPage() {
  const courses = await getCourses();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Liste */}
      <div>
        <h1 className="mb-4 text-xl font-bold text-ink">Cours ({courses.length})</h1>
        {courses.length ? (
          <div className="space-y-3">
            {courses.map((c) => (
              <div key={c.id} className="card flex items-center gap-4 p-4">
                <Link href={`/admin/cours/${c.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/[0.04] text-ink">
                    <IconBook width={19} height={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{c.title}</p>
                    <p className="truncate text-xs text-muted">
                      {c.category} · {c.level}
                      {c.instructor ? ` · ${c.instructor}` : ''}
                    </p>
                  </div>
                  <span className="hidden items-center gap-1 text-xs font-semibold text-muted sm:flex">
                    Contenu <IconChevronRight width={14} height={14} />
                  </span>
                </Link>
                <form action={deleteCourse.bind(null, c.id)}>
                  <button
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Supprimer"
                    title="Supprimer le cours"
                  >
                    <IconX width={18} height={18} />
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-muted">
            Aucun cours pour l&apos;instant. Créez-en un avec le formulaire → vous serez
            ensuite amené sur sa page pour ajouter les <b className="text-ink">curriculums</b>,
            <b className="text-ink"> les vidéos</b> et les <b className="text-ink">quiz</b>.
          </div>
        )}
      </div>

      {/* Formulaire d'ajout */}
      <div>
        <div className="card sticky top-[150px] p-5">
          <h2 className="font-bold text-ink">Ajouter un cours</h2>
          <p className="mb-4 mt-1 text-xs text-muted">
            Après publication, vous ajouterez les curriculums, vidéos et quiz sur la page du cours.
          </p>
          <form action={createCourse} className="space-y-3">
            <div>
              <label className="label">Titre *</label>
              <input name="title" required className="input" placeholder="Ex. Devenir Designer UI/UX" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Catégorie</label>
                <select name="category" className="input" defaultValue="Design">
                  <option>Design</option>
                  <option>Développement</option>
                  <option>Marketing</option>
                  <option>Rédaction</option>
                  <option>Vidéo</option>
                  <option>Business</option>
                </select>
              </div>
              <div>
                <label className="label">Niveau</label>
                <select name="level" className="input" defaultValue="Débutant">
                  <option>Débutant</option>
                  <option>Intermédiaire</option>
                  <option>Avancé</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Formateur</label>
              <input name="instructor" className="input" placeholder="Nom du formateur" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Leçons</label>
                <input name="lessons" type="number" min="0" className="input" placeholder="0" />
              </div>
              <div>
                <label className="label">Heures</label>
                <input name="hours" type="number" min="0" step="0.5" className="input" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="label">Étiquette (optionnel)</label>
              <input name="tag" className="input" placeholder="Ex. Nouveau, Populaire…" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea name="description" className="input min-h-[80px] resize-none" placeholder="Ce que le cours apporte…" />
            </div>
            <button className="btn-primary w-full">Publier le cours</button>
          </form>
        </div>
      </div>
    </div>
  );
}
