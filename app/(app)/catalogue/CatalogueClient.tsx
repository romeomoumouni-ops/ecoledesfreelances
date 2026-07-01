'use client';

import { useState } from 'react';
import { PageHeader, CourseCard, EmptyState } from '@/components/UI';
import { categories } from '@/lib/data';
import type { Course } from '@/lib/data';
import {
  IconSearch,
  IconCompass,
  IconSparkle,
  IconPen,
  IconCode,
  IconMegaphone,
  IconCamera,
  IconBriefcase,
} from '@/components/Icons';

const iconMap: Record<string, (p: { width?: number; height?: number }) => JSX.Element> = {
  sparkle: IconSparkle,
  pen: IconPen,
  code: IconCode,
  megaphone: IconMegaphone,
  camera: IconCamera,
  briefcase: IconBriefcase,
};

export default function CatalogueClient({ courses }: { courses: Course[] }) {
  const [cat, setCat] = useState('Tous');
  const [query, setQuery] = useState('');

  const filtered = courses.filter((c) => {
    const okCat = cat === 'Tous' || c.category === cat;
    const okQuery =
      !query ||
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      (c.instructor ?? '').toLowerCase().includes(query.toLowerCase());
    return okCat && okQuery;
  });

  return (
    <>
      <PageHeader
        title="Catalogue"
        subtitle="Tous les cours de votre programme."
      />

      <div className="relative mb-5 max-w-xl">
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

      <div className="scrollbar-hide mb-6 flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => {
          const Icon = iconMap[c.icon] || IconSparkle;
          const active = cat === c.name;
          return (
            <button
              key={c.name}
              onClick={() => setCat(c.name)}
              className={`chip shrink-0 gap-2 px-4 py-2.5 text-sm transition ${
                active
                  ? 'bg-ink text-white'
                  : 'border border-line bg-white text-muted hover:bg-black/[0.03] hover:text-ink'
              }`}
            >
              <Icon width={16} height={16} />
              {c.name}
            </button>
          );
        })}
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
              ? 'Essayez un autre mot-clé ou changez de catégorie.'
              : 'Les cours publiés par vos formateurs apparaîtront ici.'
          }
        />
      )}
    </>
  );
}
