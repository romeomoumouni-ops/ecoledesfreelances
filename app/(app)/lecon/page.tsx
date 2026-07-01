'use client';

import Link from 'next/link';
import { useState } from 'react';
import { lessonCurriculum } from '@/lib/data';
import { ProgressBar, Badge } from '@/components/UI';
import {
  IconPlayFill,
  IconCheck,
  IconLock,
  IconChevronRight,
  IconArrowRight,
  IconBook,
  IconChat,
  IconDownload,
  IconCheckCircle,
} from '@/components/Icons';

const allLessons = lessonCurriculum.flatMap((m) => m.lessons);
const totalDone = allLessons.filter((l) => l.done).length;
const progress = Math.round((totalDone / allLessons.length) * 100);

export default function LeconPage() {
  const [tab, setTab] = useState<'apercu' | 'ressources' | 'questions'>('apercu');

  return (
    <>
      <Link href="/catalogue/design-ui-ux" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <IconChevronRight width={16} height={16} className="rotate-180" /> Retour à la formation
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lecteur + contenu */}
        <div className="space-y-6 lg:col-span-2">
          {/* Lecteur vidéo */}
          <div className="card overflow-hidden">
            <div className="relative flex aspect-video items-center justify-center bg-ink">
              <div className="absolute inset-0 opacity-[0.06]" style={dots} />
              <button className="group relative grid h-20 w-20 place-items-center rounded-full bg-white text-ink shadow-glow transition hover:scale-105">
                <IconPlayFill width={28} height={28} />
              </button>
              <span className="absolute bottom-4 left-4 chip bg-white/10 text-white backdrop-blur">
                Leçon 3 · 15:00
              </span>
            </div>
          </div>

          {/* Titre + actions */}
          <div className="card p-6">
            <Badge color="#3b82f6">Module 1 — Les bases du design</Badge>
            <h1 className="mt-2 text-xl font-bold text-ink">
              Couleur, typographie et espace
            </h1>
            <p className="mt-2 text-sm text-muted">
              Apprenez à combiner couleurs, polices et espacements pour créer des
              interfaces équilibrées et professionnelles.
            </p>

            {/* Onglets */}
            <div className="mt-5 flex gap-1 border-b border-line">
              {[
                { id: 'apercu', label: 'Aperçu' },
                { id: 'ressources', label: 'Ressources' },
                { id: 'questions', label: 'Questions' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as typeof tab)}
                  className={`relative px-4 py-3 text-sm font-semibold transition ${
                    tab === t.id ? 'text-ink' : 'text-muted hover:text-ink'
                  }`}
                >
                  {t.label}
                  {tab === t.id && (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-ink" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-5">
              {tab === 'apercu' && (
                <div className="space-y-4 text-sm leading-relaxed text-muted">
                  <p>
                    Dans cette leçon, nous explorons les trois piliers d&apos;une
                    interface réussie : la couleur, la typographie et l&apos;espace.
                  </p>
                  <ul className="space-y-2">
                    {['Choisir une palette cohérente', 'Hiérarchiser le texte', 'Utiliser l\'espace négatif'].map((p) => (
                      <li key={p} className="flex items-center gap-2 text-ink">
                        <IconCheckCircle width={18} height={18} className="text-muted" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tab === 'ressources' && (
                <div className="space-y-2">
                  {['Fichier Figma de la leçon', 'Palette de couleurs (PDF)', 'Cheatsheet typographie'].map((r) => (
                    <button key={r} className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition hover:border-[#dcdcda]">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-black/[0.04] text-ink">
                        <IconDownload width={18} height={18} />
                      </span>
                      <span className="flex-1 text-sm font-semibold text-ink">{r}</span>
                      <IconChevronRight width={16} height={16} className="text-muted" />
                    </button>
                  ))}
                </div>
              )}
              {tab === 'questions' && (
                <div className="flex items-center gap-3 rounded-xl bg-surface p-4 text-sm text-muted">
                  <IconChat width={20} height={20} className="text-muted" />
                  Posez vos questions, la formatrice et la communauté vous répondent.
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
              <button className="btn-outline">Leçon précédente</button>
              <button className="btn-primary">
                Marquer comme terminée
                <IconArrowRight width={18} height={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Programme latéral */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-1.5 flex items-center justify-between text-sm font-semibold">
              <span className="text-ink">Progression du cours</span>
              <span className="text-ink">{progress}%</span>
            </div>
            <ProgressBar value={progress} />
            <p className="mt-2 text-xs text-muted">
              {totalDone} / {allLessons.length} leçons terminées
            </p>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line p-4">
              <IconBook width={18} height={18} className="text-ink" />
              <p className="font-bold text-ink">Contenu de la formation</p>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              {lessonCurriculum.map((mod) => (
                <div key={mod.section}>
                  <p className="bg-surface px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted">
                    {mod.section}
                  </p>
                  {mod.lessons.map((l) => (
                    <div
                      key={l.title}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        'current' in l && l.current ? 'bg-black/[0.04]' : ''
                      }`}
                    >
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                          l.done ? 'bg-black/[0.06] text-ink' : l.locked ? 'bg-surface text-muted' : 'bg-black/[0.04] text-muted'
                        }`}
                      >
                        {l.done ? <IconCheck width={14} height={14} /> : l.locked ? <IconLock width={13} height={13} /> : <IconPlayFill width={12} height={12} />}
                      </span>
                      <span className={`flex-1 text-sm ${l.locked ? 'text-muted' : 'text-ink'} ${'current' in l && l.current ? 'font-bold' : ''}`}>
                        {l.title}
                      </span>
                      <span className="text-xs text-muted">{l.duration}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const dots: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1.5px, transparent 1.5px)',
  backgroundSize: '20px 20px',
};
