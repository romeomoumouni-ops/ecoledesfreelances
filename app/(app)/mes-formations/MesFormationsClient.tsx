'use client';

import { useState } from 'react';
import { PageHeader, CourseCard, EmptyState } from '@/components/UI';
import type { Course } from '@/lib/data';
import { IconBook } from '@/components/Icons';

const tabs = ['En cours', 'Terminées', 'Toutes'] as const;

export default function MesFormationsClient({ courses }: { courses: Course[] }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>('En cours');

  const mine = courses.filter((c) => c.progress !== undefined);
  const filtered =
    tab === 'En cours'
      ? mine.filter((c) => (c.progress ?? 0) < 100)
      : tab === 'Terminées'
      ? mine.filter((c) => c.progress === 100)
      : mine;

  const avg = mine.length
    ? Math.round(mine.reduce((s, c) => s + (c.progress ?? 0), 0) / mine.length)
    : 0;

  return (
    <>
      <PageHeader
        title="Mes cours à suivre"
        subtitle="Suivez votre progression et reprenez là où vous vous êtes arrêté."
      />

      {/* Résumé progression globale */}
      <div className="card mb-6 flex flex-wrap items-center gap-6 p-5">
        <div className="flex items-center gap-4">
          <ProgressRing value={avg} />
          <div>
            <p className="text-sm text-muted">Progression globale</p>
            <p className="text-xl font-bold text-ink">{avg}% terminé</p>
          </div>
        </div>
        <div className="h-10 w-px bg-line max-sm:hidden" />
        <div className="flex gap-8">
          <div>
            <p className="text-xl font-bold text-ink">
              {mine.filter((c) => (c.progress ?? 0) < 100).length}
            </p>
            <p className="text-sm text-muted">En cours</p>
          </div>
          <div>
            <p className="text-xl font-bold text-ink">
              {mine.filter((c) => c.progress === 100).length}
            </p>
            <p className="text-sm text-muted">Terminées</p>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="mb-5 inline-flex rounded-xl border border-line bg-white p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              tab === t ? 'bg-ink text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      ) : (
        <EmptyState
          Icon={IconBook}
          title="Aucun cours ici"
          text="Vous n'avez pas encore de cours dans cette catégorie."
        />
      )}
    </>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="-rotate-90">
      <circle cx="34" cy="34" r={r} fill="none" stroke="#ececeb" strokeWidth="7" />
      <circle
        cx="34"
        cy="34"
        r={r}
        fill="none"
        stroke="#1d1d1f"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * value) / 100}
      />
      <text
        x="34"
        y="34"
        transform="rotate(90 34 34)"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-ink text-[15px] font-bold"
      >
        {value}%
      </text>
    </svg>
  );
}
