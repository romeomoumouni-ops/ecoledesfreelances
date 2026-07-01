'use client';

import { useState } from 'react';
import {
  IconSearch,
  IconChevronDown,
  IconBook,
  IconTrend,
  IconUsers,
  IconChat,
  IconMail,
} from '@/components/Icons';

const topics = [
  { Icon: IconBook, title: 'Démarrer', text: 'Premiers pas sur la plateforme' },
  { Icon: IconTrend, title: 'Ma progression', text: 'Suivre votre avancée dans le programme' },
  { Icon: IconUsers, title: 'Communauté', text: 'Règles et bonnes pratiques' },
  { Icon: IconChat, title: 'Mon accès', text: 'Programme et abonnement' },
];

const faqs = [
  {
    q: 'Comment accéder à mes formations ?',
    a: 'Rendez-vous dans « Mes formations » depuis le menu de gauche. Vous y retrouverez toutes vos formations en cours et terminées, avec votre progression.',
  },
  {
    q: 'Le programme est-il complet dès le départ ?',
    a: 'Votre accès couvre l\'intégralité du programme de l\'École des Freelances. De nouvelles leçons s\'ajoutent en continu : vous progressez à votre rythme, sans rien racheter.',
  },
  {
    q: 'Comment fonctionne le classement ?',
    a: 'Vous gagnez des points en terminant des leçons, en rendant vos devoirs et en maintenant votre série quotidienne. Le classement est mis à jour chaque semaine.',
  },
  {
    q: 'Puis-je apprendre à mon rythme ?',
    a: 'Oui, toutes les formations sont disponibles à la demande. Vous avancez quand vous voulez et reprenez là où vous vous êtes arrêté.',
  },
  {
    q: 'Comment contacter un formateur ?',
    a: 'Chaque leçon dispose d\'un onglet « Questions ». Vous pouvez aussi échanger avec les formateurs et les autres élèves dans la Communauté.',
  },
];

export default function AidePage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Hero */}
      <div className="mb-8 pt-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Comment pouvons-nous vous aider ?</h1>
        <p className="mt-2 text-muted">Trouvez rapidement une réponse à vos questions.</p>
        <div className="relative mx-auto mt-6 max-w-md">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            <IconSearch />
          </span>
          <input className="input py-3 pl-12 text-ink" placeholder="Rechercher dans l'aide…" />
        </div>
      </div>

      {/* Thèmes */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {topics.map((t) => (
          <button key={t.title} className="card p-5 text-left transition hover:-translate-y-1 hover:shadow-soft">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-black/[0.04] text-ink">
              <t.Icon width={22} height={22} />
            </span>
            <p className="mt-3 font-bold text-ink">{t.title}</p>
            <p className="text-sm text-muted">{t.text}</p>
          </button>
        ))}
      </div>

      {/* FAQ */}
      <h2 className="mb-4 text-lg font-bold text-ink">Questions fréquentes</h2>
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
            {open === i && (
              <div className="px-5 pb-4 text-sm leading-relaxed text-muted">{f.a}</div>
            )}
          </div>
        ))}
      </div>

      {/* Contact */}
      <div className="card mt-8 flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-black/[0.04] text-ink">
          <IconMail width={26} height={26} />
        </span>
        <div className="flex-1">
          <p className="font-bold text-ink">Vous ne trouvez pas votre réponse ?</p>
          <p className="text-sm text-muted">Notre équipe vous répond en moins de 24 h.</p>
        </div>
        <button className="btn-primary">Contacter le support</button>
      </div>
    </div>
  );
}
