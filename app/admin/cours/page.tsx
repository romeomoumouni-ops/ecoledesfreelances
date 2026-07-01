import Link from 'next/link';
import { getCourses } from '@/lib/db';
import { deleteCourse } from '@/lib/admin-actions';
import CreateCourseForm from '@/components/admin/CreateCourseForm';
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
              <div key={c.id} className="card flex items-center gap-4 p-3">
                <Link href={`/admin/cours/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  {c.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.thumbnail_url} alt="" className="h-12 w-20 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span className="grid h-12 w-20 shrink-0 place-items-center rounded-md bg-black/[0.04] text-muted">
                      <IconBook width={18} height={18} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{c.title}</p>
                    <p className="truncate text-xs text-muted">
                      {c.level}
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
            Aucun cours pour l&apos;instant. Créez-en un avec le formulaire → vous serez ensuite
            amené sur sa page pour ajouter les <b className="text-ink">chapitres</b>,
            <b className="text-ink"> les vidéos</b> et les <b className="text-ink">quiz</b>.
          </div>
        )}
      </div>

      {/* Formulaire d'ajout */}
      <div>
        <div className="card p-5 lg:sticky lg:top-[150px]">
          <h2 className="font-bold text-ink">Ajouter un cours</h2>
          <p className="mb-4 mt-1 text-xs text-muted">
            Ajoutez une miniature et les infos, puis vous ajouterez les chapitres et vidéos.
          </p>
          <CreateCourseForm />
        </div>
      </div>
    </div>
  );
}
