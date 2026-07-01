'use client';

import { useState } from 'react';
import { Badge } from '@/components/UI';
import Avatar from '@/components/Avatar';
import type { LeaderRow } from '@/lib/data';
import { IconFlame } from '@/components/Icons';

const periods = ['Cette semaine', 'Ce mois', 'Tout le temps'] as const;

function initials(name: string) {
  if (name === 'Vous') return 'VS';
  return name.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
}

export default function ClassementClient({ rows }: { rows: LeaderRow[] }) {
  const [period, setPeriod] = useState<(typeof periods)[number]>('Cette semaine');
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[26px]">Classement</h1>
          <p className="mt-1 text-sm text-muted">
            Gagnez des points en terminant des leçons et grimpez dans le classement.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-line bg-white p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                period === p ? 'bg-ink text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Bannière motivation */}
      <div className="card mb-6 p-6 sm:p-8">
        <div className="max-w-xl">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Vous êtes plus proche que vous ne le pensez
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Plus que <b className="font-semibold text-ink">10 points</b> pour entrer
            dans le Top 5. Terminez une leçon ou maintenez votre série pour gagner des places.
          </p>
          <button className="btn-primary mt-4">Continuer à apprendre</button>
        </div>
      </div>

      {/* Podium Top 3 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {top3.map((row) => (
          <div key={row.rank} className="card relative p-5">
            <span className="absolute right-5 top-5 grid h-6 w-6 place-items-center rounded-full bg-black/[0.06] text-xs font-semibold text-ink">
              {row.rank}
            </span>
            <div className="flex items-center justify-between pr-8">
              <Avatar initials={initials(row.name)} size={48} ring />
              <span className="text-sm font-semibold text-ink">
                {row.points.toLocaleString('fr-FR')}
              </span>
            </div>
            <p className="mt-3 text-base font-semibold text-ink">{row.name}</p>
            <p className="text-sm text-muted">
              {row.courses} formations ·{' '}
              <span className="inline-flex items-center gap-1">
                <IconFlame width={14} height={14} /> {row.streak} j
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {row.badges.slice(0, 2).map((b) => (
                <Badge key={b}>{b}</Badge>
              ))}
              {row.badges.length > 2 && <Badge variant="outline">{row.badges[2]}</Badge>}
            </div>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[60px_1fr_140px_120px_1fr] gap-4 border-b border-line px-6 py-4 text-xs font-bold uppercase tracking-wide text-muted sm:grid">
          <span>Rang</span>
          <span>Utilisateur</span>
          <span>Formations</span>
          <span>Série</span>
          <span>Badges</span>
        </div>

        {rest.map((row) => (
          <div
            key={row.rank}
            className={`grid grid-cols-[40px_1fr] items-center gap-4 px-4 py-4 sm:grid-cols-[60px_1fr_140px_120px_1fr] sm:px-6 ${
              row.isYou ? 'bg-black/[0.03]' : 'border-t border-line'
            }`}
          >
            <span className={`text-center text-sm font-bold ${row.isYou ? 'text-ink' : 'text-muted'}`}>
              {row.rank}
            </span>

            <div className="flex items-center gap-3">
              <Avatar initials={initials(row.name)} size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">
                  {row.name} {row.isYou && <span className="text-muted">(vous)</span>}
                </p>
                <p className="text-xs text-muted sm:hidden">
                  {row.courses} formations · {row.points} pts
                </p>
              </div>
            </div>

            <span className="hidden text-sm text-muted sm:block">{row.courses} formations</span>
            <span className="hidden items-center gap-1.5 text-sm text-muted sm:flex">
              <IconFlame width={15} height={15} className="text-muted" /> {row.streak} jours
            </span>
            <div className="hidden flex-wrap gap-1.5 sm:flex">
              {row.badges.slice(0, 2).map((b) => (
                <Badge key={b} variant={row.isYou ? 'solid' : 'soft'}>
                  {b}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
