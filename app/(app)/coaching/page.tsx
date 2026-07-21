export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/user';
import { IconCheckCircle, IconSparkle, IconArrowRight } from '@/components/Icons';

export const metadata = { title: 'Coaching privé avec Roméo' };

const WHATSAPP = 'https://wa.me/22999002211';

const CTA_LABEL = 'Je suis prêt à faire un coaching en privé avec le coach Roméo';

function WhatsAppButton({ big = false }: { big?: boolean }) {
  return (
    <a
      href={WHATSAPP}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#25D366] font-bold text-white shadow-lg transition hover:bg-[#1fb958] active:scale-[0.99] ${
        big ? 'flex-col gap-1 px-6 py-4 text-base' : 'px-5 py-3.5 text-sm'
      }`}
    >
      <span className="flex items-center gap-2.5">
        {/* Logo WhatsApp */}
        <svg width={big ? 22 : 19} height={big ? 22 : 19} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.62 15.06L2 22l5.09-1.33A10 10 0 1 0 12 2Zm0 18.13c-1.5 0-2.97-.4-4.26-1.15l-.3-.18-3.02.79.8-2.95-.19-.3A8.13 8.13 0 1 1 12 20.13Zm4.46-6.09c-.24-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.53.06-.24-.12-1.03-.38-1.96-1.21-.72-.64-1.21-1.44-1.35-1.68-.14-.24-.02-.37.11-.5.11-.11.24-.28.37-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.34.99 2.5c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.05.14-1.16-.06-.1-.22-.16-.46-.28Z" />
        </svg>
        {CTA_LABEL}
      </span>
      {big && <span className="text-xs font-semibold opacity-90">pour aller beaucoup plus vite 🚀</span>}
    </a>
  );
}

export default async function CoachingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');
  const firstName = profile.full_name.split(' ')[0];

  return (
    <div className="mx-auto max-w-2xl">
      {/* En-tête */}
      <div className="text-center">
        <span className="chip mx-auto bg-ink text-white">
          <IconSparkle width={13} height={13} /> Accompagnement 1-à-1 · places limitées
        </span>
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-ink">
          Coaching privé avec <span className="whitespace-nowrap">Roméo Moumouni</span>
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
          {firstName}, avec l&apos;École des Freelances tu as déjà tout pour réussir : les cours, les
          coachs, la communauté. Mais si tu veux <b className="text-ink">aller beaucoup plus vite</b>,
          il existe une voie express : travailler <b className="text-ink">directement avec Roméo, en
          tête-à-tête</b>.
        </p>
      </div>

      {/* Preuve : trophées systeme.io */}
      <div className="card mt-8 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/coaching-trophees.jpg"
          alt="Roméo Moumouni avec ses deux trophées systeme.io : 50 000 € et 100 000 € de ventes"
          className="w-full object-cover"
        />
        <div className="p-5 text-center">
          <p className="font-bold text-ink">Des résultats certifiés, pas des promesses.</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Trophées officiels systeme.io remis à Roméo pour <b className="text-ink">50 000 €</b> puis{' '}
            <b className="text-ink">100 000 € de ventes</b> générées en ligne. C&apos;est cette
            expérience-là qu&apos;il met à ton service en coaching privé.
          </p>
        </div>
      </div>

      {/* Roméo en action (interviews / podcasts) */}
      <div className="mt-8">
        <div className="grid grid-cols-2 gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/coaching-podcast-1.jpg"
            alt="Roméo Moumouni en interview au micro, en studio"
            className="aspect-[3/4] w-full rounded-xl border border-line object-cover"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/coaching-podcast-2.jpg"
            alt="Roméo Moumouni invité d'un podcast, en pleine discussion"
            className="aspect-[3/4] w-full rounded-xl border border-line object-cover"
          />
        </div>
        <p className="mt-2 text-center text-xs leading-relaxed text-muted">
          Invité et écouté sur les plateaux — c&apos;est cette même méthode que Roméo t&apos;apprend,
          appliquée à <b className="text-ink">ton</b> cas précis.
        </p>
      </div>

      {/* Ce que tu obtiens */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-ink">Ce que le 1-à-1 change pour toi</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ['Un plan taillé pour TOI', 'Ta situation, ton niveau, ton objectif : Roméo construit ta feuille de route personnelle, étape par étape.'],
            ['Des réponses immédiates', 'Fini de rester bloqué des jours : tu poses ta question directement à Roméo et tu avances le jour même.'],
            ['Le regard d’un expert sur ton travail', 'Tes services, tes offres, ta prospection passés au crible — tu corriges vite ce qui te coûte des clients.'],
            ['La pression positive', 'Un rendez-vous avec Roméo, ça ne se rate pas : tu passes à l’action chaque semaine, sans excuse.'],
          ].map(([title, text]) => (
            <div key={title} className="card p-4">
              <p className="flex items-start gap-2 font-bold text-ink">
                <IconCheckCircle width={18} height={18} className="mt-0.5 shrink-0 text-green-600" />
                {title}
              </p>
              <p className="mt-1.5 pl-6 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Le contraste : école vs coaching */}
      <div className="card mt-8 p-5">
        <p className="text-sm leading-relaxed text-ink">
          🎯 <b>Sois clair avec toi-même :</b> l&apos;école te fait avancer, c&apos;est certain — des
          centaines de membres le prouvent chaque semaine dans la communauté. Le coaching privé, lui,
          <b> compresse le temps</b> : ce que tu mettrais des mois à comprendre seul, Roméo te le fait
          appliquer en quelques séances, parce qu&apos;il l&apos;a déjà fait, et qu&apos;il ne
          s&apos;occupe que de toi.
        </p>
      </div>

      {/* CTA principal */}
      <div className="mt-8">
        <WhatsAppButton big />
        <p className="mt-2 text-center text-xs text-muted">
          Le bouton ouvre WhatsApp — tu parles directement avec l&apos;équipe de Roméo.
        </p>
      </div>

      {/* Rassurance finale */}
      <div className="mb-4 mt-8 flex items-center justify-center gap-2 text-center text-xs text-muted">
        <IconArrowRight width={14} height={14} className="rotate-90" />
        Les places de coaching privé sont volontairement limitées pour garantir un vrai suivi.
      </div>
    </div>
  );
}
