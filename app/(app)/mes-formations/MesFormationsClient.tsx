'use client';

import { PageHeader, CourseCard, EmptyState } from '@/components/UI';
import type { Course } from '@/lib/data';
import { IconBook } from '@/components/Icons';

export default function MesFormationsClient({ courses }: { courses: Course[] }) {
  return (
    <>
      <PageHeader
        title="Mes cours à suivre"
        subtitle="Tous les cours de votre programme. Ouvrez-en un pour commencer."
      />

      {courses.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      ) : (
        <EmptyState
          Icon={IconBook}
          title="Aucun cours pour l'instant"
          text="Les cours de votre programme apparaîtront ici dès qu'ils seront publiés."
        />
      )}
    </>
  );
}
