'use client';

import { useState } from 'react';
import { PageHeader, CourseCard, EmptyState } from '@/components/UI';
import type { Course } from '@/lib/data';
import { IconSearch, IconCompass } from '@/components/Icons';

export default function CatalogueClient({ courses }: { courses: Course[] }) {
  const [query, setQuery] = useState('');

  const filtered = courses.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.title.toLowerCase().includes(q) || (c.instructor ?? '').toLowerCase().includes(q);
  });

  return (
    <>
      <PageHeader title="Catalogue" subtitle="Tous les cours de votre programme." />

      <div className="relative mb-6 max-w-xl">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          <IconSearch />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input py-3 pl-12"
          placeholder="Rechercher un cours, un formateur…"
        />
      </div>

      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      ) : (
        <EmptyState
          Icon={IconCompass}
          title={courses.length ? 'Aucun résultat' : 'Aucun cours pour le moment'}
          text={
            courses.length
              ? 'Essayez un autre mot-clé.'
              : 'Les cours publiés par vos formateurs apparaîtront ici.'
          }
        />
      )}
    </>
  );
}
