'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconChevronDown, IconChat } from '@/components/Icons';

const faqs = [
  {
    q: 'Comment accéder à mes cours ?',
    a: 'Rendez-vous dans « Mes cours à suivre » depuis le menu. Cliquez sur un cours pour ouvrir ses chapitres : la vidéo reprend automatiquement là où vous vous étiez arrêté.',
  },
  {
    q: "Comment fonctionne l'Objectif (score sur 100) ?",
    a: "L'onglet « Objectif » liste les tâches de votre parcours. Cochez honnêtement chaque tâche accomplie : vos points s'ajoutent et votre progression apparaît sur le tableau de bord.",
  },
  {
    q: 'Le programme est-il complet dès le départ ?',
    a: "Votre accès couvre l'intégralité du programme. De nouvelles leçons s'ajoutent en continu : vous progressez à votre rythme, sans rien racheter.",
  },
  {
    q: 'Comment rendre un devoir ?',
    a: "Dans l'onglet « Devoirs », réalisez l'exercice demandé puis cliquez sur « Marquer comme rendu ». Vous pouvez annuler un rendu en cas d'erreur.",
  },
  {
    q: 'Comment participer aux sessions live ?',
    a: "L'onglet « Live » affiche les coachings de groupe programmés. Le bouton « Rejoindre le live » apparaît quand le lien de la session est disponible.",
  },
  {
    q: 'Comment contacter un coach ?',
    a: 'Utilisez le bouton « Contacter les coachs » ci-dessous : choisissez Coach Christian, Coach Tobi, Coach Mohamed ou Marianne, et envoyez votre message. La réponse arrive au même endroit.',
  },
];

export default function AidePage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 pt-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Comment pouvons-nous vous aider ?</h1>
        <p className="mt-2 text-muted">Les réponses aux questions les plus fréquentes.</p>
      </div>

      <div className="card divide-y divide-line overflow-hidden">
        {faqs.map((f, i) => (
          <div key={f.q}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-semibold text-ink">{f.q}</span>
              <span className={`shrink-0 text-muted transition-transform ${open === i ? 'rotate-180' : ''}`}>
                <IconChevronDown />
              </span>
            </button>
            {open === i && <div className="px-5 pb-4 text-sm leading-relaxed text-muted">{f.a}</div>}
          </div>
        ))}
      </div>

      <div className="card mt-6 flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-black/[0.04] text-ink">
          <IconChat width={22} height={22} />
        </span>
        <div className="flex-1">
          <p className="font-bold text-ink">Vous ne trouvez pas votre réponse ?</p>
          <p className="text-sm text-muted">Écrivez directement à un coach, il vous répondra.</p>
        </div>
        <Link href="/contact" className="btn-primary">
          Contacter les coachs
        </Link>
      </div>
    </div>
  );
}
