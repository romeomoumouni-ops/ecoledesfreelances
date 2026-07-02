import { getCourses } from '@/lib/db';
import CreateCourseForm from '@/components/admin/CreateCourseForm';
import CoursesReorderList from '@/components/admin/CoursesReorderList';

export const dynamic = 'force-dynamic';

export default async function AdminCoursPage() {
  const courses = await getCourses();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Liste */}
      <div>
        <h1 className="mb-4 text-xl font-bold text-ink">Cours ({courses.length})</h1>
        <CoursesReorderList courses={courses} />
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
