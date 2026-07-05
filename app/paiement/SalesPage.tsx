'use client';

import { useState } from 'react';

const SHAKE_CSS = `
@keyframes ctaShake {
  0% { transform: translateX(0) rotate(0); }
  2% { transform: translateX(-3px) rotate(-1deg); }
  4% { transform: translateX(3px) rotate(1deg); }
  6% { transform: translateX(-3px) rotate(-1deg); }
  8% { transform: translateX(3px) rotate(1deg); }
  10% { transform: translateX(-2px) rotate(0); }
  12% { transform: translateX(0) rotate(0); }
  100% { transform: translateX(0) rotate(0); }
}
.cta-shake { animation: ctaShake 1s infinite; }
`;

const COUNTRIES = [
  ['BJ', 'Bénin'], ['CI', 'Côte d’Ivoire'], ['SN', 'Sénégal'], ['TG', 'Togo'], ['CM', 'Cameroun'],
  ['BF', 'Burkina Faso'], ['ML', 'Mali'], ['GN', 'Guinée'], ['NE', 'Niger'], ['CD', 'RD Congo'],
  ['CG', 'Congo'], ['GA', 'Gabon'], ['TD', 'Tchad'], ['FR', 'France'],
] as const;

const VIMEO = (id: string, h: string) => `https://player.vimeo.com/video/${id}?h=${h}&title=0&byline=0&portrait=0`;
const VIDEOS = {
  main: VIMEO('1123278575', '9cf6699074'),
  temoin1: VIMEO('1123276544', 'daf820cd8c'),
  temoin2: 'https://www.youtube.com/embed/YeJacntafys',
};

const IMG = 'https://d1yei2z3i6k35z.cloudfront.net/3149562/';
const MOCKUP = IMG + '68df964e83a6d_OnlineCourseLaunchMockupInstagramPost.png';
const GARANTIE = 'https://d1yei2z3i6k35z.cloudfront.net/370167/68335e0954d60_Garantie.png';
const TEMOINS = [
  IMG + '68ddbbdeb49da_IMG_077531.jpg',
  IMG + '68ddbc10b5bfe_381.png',
  IMG + '68ddbbafd17b2_IMG_46931.jpg',
  IMG + '68ddb6fa7ae5e_Capturedécran2025-08-19à22.56.412.png',
  IMG + '68ddb804d48ba_Capturedécran2024-07-17à03.18.291.png',
  IMG + '68ddb76ddf1ad_IMG_19021.jpg',
  IMG + '68ddb7eaf1f06_Capturedécran2024-07-17à03.57.111.png',
  IMG + '68ddb7cd04206_Capturedécran2025-02-11à04.51.051.png',
];

const BONUS = [
  'Chaque semaine, je te donne accès à des opportunités de missions où tu seras payé. Je ne te laisserai pas tomber tant que tu n’as pas de clients avec qui tu travailles et qui te paient cher (valeur : 600.000 FCFA)',
  '4 mois de coaching de groupes supplémentaires offerts avec 2 sessions d’1h30 par semaine pour répondre à toutes tes questions et t’aider à mieux avancer dans ton activité (valeur : 250.000 FCFA)',
  'Tu es souvent occupé(e) et tu ne pourras pas assister aux séances de coaching ? Aucun souci, tu auras accès aux replays de toutes les séances de coaching. (valeur : 120.000 FCFA)',
  'Tu as accès à TROIS COACHS qui t’accompagneront et qui ne te lâcheront pas tant que tu ne dis pas « C’est bon. Je suis libre financièrement maintenant. » (valeur : 600.000 FCFA)',
  'Vous allez accéder gratuitement à mes workshops internationaux en présentiel que je fais partout en Afrique. (valeur : 150.000 FCFA)',
  'J’ai recruté récemment une assistante et son rôle est de suivre ta progression chaque semaine, prendre de tes nouvelles, connaître tes problématiques afin que je puisse savoir comment t’aider personnellement. (valeur : 100.000 FCFA)',
  'Tu as un accès à vie à la communauté « L’ÉCOLE DES FREELANCES » dans laquelle tu pourras trouver et réseauter avec des personnes qui partagent le même objectif que toi. (valeur : 55.000 FCFA)',
  'J’investis aussi dans des formations et accompagnements à plusieurs millions de FCFA. Et à chaque fois que j’apprends quelque chose de nouveau, je l’ajoute directement dans l’incubateur pour en faire profiter mes élèves. (valeur : 100.000 FCFA)',
  'Dès que tu rejoins l’incubateur, une fiche de suivi t’est accordée. Cette fiche me permet de suivre personnellement ta progression. (valeur : 100.000 FCFA)',
  'L’option premium et avancé de ChatGPT coûte 12.000 FCFA par mois soit 200.000 FCFA sur 1 an. Mais toi, tu n’auras pas à payer ça. Je te donne un accès à vie à ChatGPT premium. (valeur : 200.000 FCFA)',
];

const PREMIUM = [
  ['Recommandation VIP', 'Je te recommande personnellement à des clients qui vont te payer pour travailler directement avec toi.'],
  ['Onboarding VIP', 'Une session d’onboarding VIP individuel 1:1 avec un membre de mon équipe afin de définir tes objectifs.'],
  ['Voyage offert', 'Chaque année, j’offre un voyage de 3 jours dans un lieu paradisiaque. C’est le moment pour toi de découvrir d’autres pays, de changer d’environnement et de profiter de ta liberté financière.'],
  ['1 place offerte', 'Tu pourras offrir l’entièreté du programme à un proche gratuitement.'],
  ['Partenaire', 'Je te donne mon équipe et ils t’accompagneront à développer ton activité de freelance IA.'],
];

const GARANTIES = [
  ['Garantie 1 — Test 100 % sans risque (3 jours)', 'Tu rejoins, tu testes pendant 3 jours. Si tu penses que ce n’est pas pour toi, tu m’écris et je te rembourse ton argent. En plus, tu gardes tous les bonus.'],
  ['Garantie 2 — Coaching personnel jusqu’à résultat', 'Tu n’as fait aucun progrès en 30 jours ? Roméo aka « le Papa des freelances » t’accompagne en privé jusqu’à ce que tu aies tes premiers résultats.'],
  ['Garantie 3 — 60 jours de transformation ou remboursement', 'Tu appliques tout ce qui est dit dans le programme pendant 60 jours et tu n’as aucun résultat ? (Preuves à l’appui.) Tu es remboursé, et tu gardes tous les outils et ressources.'],
];

function VideoEmbed({ src, title }: { src: string; title: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-line bg-black" style={{ aspectRatio: '16 / 9' }}>
      <iframe
        src={src}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}

export default function SalesPage() {
  const [modal, setModal] = useState<null | '1x' | '3x'>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('BJ');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function pay() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setErr('Entre une adresse e-mail valide.'); return; }
    if (phone.replace(/\D/g, '').length < 6) { setErr('Entre ton numéro Mobile Money.'); return; }
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/join/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, phone, country, plan: modal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error || 'Le paiement n’a pas pu démarrer.'); setBusy(false); return; }
      const url = data.url || data.fallback;
      if (url) window.location.href = url;
      else { setErr('Lien de paiement indisponible.'); setBusy(false); }
    } catch {
      setErr('Erreur réseau.'); setBusy(false);
    }
  }

  const Cta = ({ id }: { id: number }) => (
    <div className="mx-auto mt-8 flex max-w-xl flex-col gap-4">
      <button
        onClick={() => setModal('1x')}
        className="cta-shake flex w-full items-center justify-center gap-3 rounded-full bg-[#2f7bdc] px-6 py-5 text-lg font-extrabold uppercase leading-tight tracking-tight text-white shadow-glow transition hover:bg-[#1f63c4]"
      >
        Rejoindre l’école des freelances en 1X
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20">→</span>
      </button>
      <button
        onClick={() => setModal('3x')}
        className="cta-shake flex w-full items-center justify-center gap-3 rounded-full bg-[#2f7bdc] px-6 py-5 text-lg font-extrabold uppercase leading-tight tracking-tight text-white shadow-glow transition hover:bg-[#1f63c4]"
        style={{ animationDelay: '0.15s' }}
      >
        Rejoindre l’école des freelances en X3
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20">→</span>
      </button>
      <p className="text-center text-xs text-white/60" data-cta={id}>Paiement sécurisé · Mobile Money, Wave, Orange, carte…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <style dangerouslySetInnerHTML={{ __html: SHAKE_CSS }} />

      {/* HERO */}
      <section className="bg-gradient-to-b from-[#0d1b34] to-[#0a0f1a] px-5 pt-14 pb-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-lg font-bold uppercase leading-snug tracking-tight sm:text-xl">
            LE <span className="text-[#4a9bff]">SEUL PROGRAMME D’ACCOMPAGNEMENT</span> INTENSIF QUI T’AIDE À{' '}
            <span className="underline">DEVENIR FREELANCE IA</span> ET ATTEINDRE ENFIN{' '}
            <span className="underline">TA LIBERTÉ FINANCIÈRE</span> EN <b>MOINS DE 60 JOURS</b> MÊME SI TU PARS DE ZÉRO.
          </p>
          <h1 className="mt-8 text-3xl font-extrabold uppercase leading-[1.05] tracking-tight sm:text-4xl">
            MAITRISE UNE <span className="text-[#4a9bff]">COMPÉTENCE IA RECHERCHÉE SUR LE MARCHÉ</span>, SIGNE{' '}
            <span className="underline">RAPIDEMENT ET FACILEMENT</span> TES PREMIERS{' '}
            <span className="text-[#4a9bff] underline">CLIENTS À PLUS DE 2000€</span> ET CONSTRUIS ENFIN LA VIE QUE TU MÉRITES GRÂCE À L’IA.
          </h1>
          <p className="mt-6 text-sm font-semibold uppercase leading-relaxed text-white/80 sm:text-base">
            AVEC <b className="text-white">TON TÉLÉPHONE</b> | SANS COMPÉTENCES TECHNIQUES | EN <b className="text-white">2H</b> PAR JOUR | SANS EXPÉRIENCE REQUISE
          </p>
          <Cta id={1} />
        </div>
      </section>

      {/* VSL */}
      <section className="px-5 py-10">
        <div className="mx-auto max-w-3xl">
          <VideoEmbed src={VIDEOS.main} title="L’École des Freelances — présentation" />
        </div>
      </section>

      {/* MOCKUP + INTRO */}
      <section className="px-5 pb-6">
        <div className="mx-auto max-w-3xl text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MOCKUP} alt="L’École des Freelances" className="mx-auto w-full max-w-md" />
          <p className="mt-6 text-lg font-bold uppercase leading-snug sm:text-xl">
            L’ÉCOLE DES FREELANCES, C’EST UN PROGRAMME D’ACCOMPAGNEMENT PERSONNALISÉ INTENSIF DE 8 SEMAINES (02 MOIS) POUR DEVENIR FREELANCE IA ET GÉNÉRER TES PREMIERS MILLIERS D’EUROS.
          </p>
        </div>
      </section>

      {/* CE QUE TU VAS OBTENIR */}
      <section className="px-5 py-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight">Ce que tu vas obtenir</h2>
          <ul className="mt-6 space-y-3">
            {[
              'Maîtriser une compétence IA rentable et demandée sur le marché.',
              'Attirer des clients vers toi et les signer rapidement sans efforts.',
              'Être accompagné personnellement et guidé étape par étape, pas à pas par le Papa des Freelances.',
              'Curriculum 1 : tu comprendras toutes les bases nécessaires pour débuter et scaler une activité de FREELANCE IA rentable (valeur : 1.967.000 FCFA).',
              'Curriculum 2 : tu vas apprendre à utiliser l’IA pour automatiser ton activité de FREELANCE IA, travailler moins et gagner plus d’argent (valeur : 3.279.000 FCFA).',
              'Curriculum 3 : je te donne toutes les stratégies que j’utilise pour signer rapidement des clients à plus de 1000€ grâce à Comeup (valeur : 4.589.000 FCFA).',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-white/90">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#2f7bdc] text-xs font-bold">✓</span>
                {t}
              </li>
            ))}
          </ul>
          <Cta id={2} />
        </div>
      </section>

      {/* TÉMOIGNAGES VIDÉO */}
      <section className="px-5 py-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight">Ils l’ont fait avant toi</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <VideoEmbed src={VIDEOS.temoin1} title="Témoignage 1" />
            <VideoEmbed src={VIDEOS.temoin2} title="Témoignage 2" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TEMOINS.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="Témoignage" className="w-full rounded-xl border border-white/10 object-cover" />
            ))}
          </div>
          <Cta id={3} />
        </div>
      </section>

      {/* BONUS */}
      <section className="px-5 py-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight">Et ce n’est pas tout — 10 bonus offerts</h2>
          <div className="mt-6 space-y-3">
            {BONUS.map((t, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-[#4a9bff]">Bonus {i + 1}</div>
                <p className="text-sm leading-relaxed text-white/90">{t}</p>
              </div>
            ))}
          </div>
          <Cta id={4} />
        </div>
      </section>

      {/* BONUS PREMIUM (1X) */}
      <section className="px-5 py-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight">Bonus premium (paiement en 1X uniquement)</h2>
          <div className="mt-6 space-y-3">
            {PREMIUM.map(([t, d], i) => (
              <div key={i} className="rounded-2xl border border-[#2f7bdc]/40 bg-[#2f7bdc]/[0.08] p-4">
                <div className="text-sm font-extrabold uppercase text-white">Bonus premium {i + 1} — {t}</div>
                <p className="mt-1 text-sm leading-relaxed text-white/85">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRIX */}
      <section className="px-5 py-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center">
          <p className="text-sm font-semibold uppercase text-white/60">Valeur totale du programme</p>
          <p className="mt-1 text-2xl font-bold text-white/50 line-through">9.835.000 FCFA</p>
          <p className="mt-4 text-sm font-semibold uppercase text-white/80">Aujourd’hui, tu rejoins pour</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-3xl font-extrabold text-white">98.000 FCFA</div>
              <div className="text-xs font-semibold uppercase text-white/60">Paiement en 1X · accès à vie</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-3xl font-extrabold text-white">65.000 FCFA</div>
              <div className="text-xs font-semibold uppercase text-white/60">× 2 · paiement en 3X</div>
            </div>
          </div>
          <Cta id={5} />
        </div>
      </section>

      {/* GARANTIES */}
      <section className="px-5 py-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight">Ta triple garantie</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GARANTIE} alt="Garantie" className="mx-auto mt-5 w-40" />
          <div className="mt-5 space-y-3">
            {GARANTIES.map(([t, d], i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-sm font-extrabold uppercase text-white">{t}</div>
                <p className="mt-1 text-sm leading-relaxed text-white/85">{d}</p>
              </div>
            ))}
          </div>
          <Cta id={6} />
        </div>
      </section>

      {/* CONTACT */}
      <section className="px-5 py-8">
        <div className="mx-auto max-w-2xl text-center text-sm text-white/80">
          <p className="font-bold text-white">Contacte-moi par WhatsApp au +229 01 57 34 28 14</p>
          <ul className="mx-auto mt-3 max-w-md space-y-1 text-left text-white/70">
            <li>• Si tu as du mal à payer (paiement échoué)</li>
            <li>• Si tu n’arrives pas à payer en ligne</li>
            <li>• Si tu souhaites payer par Western Union, MoneyGram, Ria…</li>
            <li>• Pour des renseignements supplémentaires</li>
          </ul>
          <p className="mt-4 text-xs uppercase text-white/50">Paiement : Mobile Money · Moov · Flooz · Orange Money · Wave · carte · crypto</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 px-5 py-8 text-center text-[11px] leading-relaxed text-white/40">
        <p>Ce site n’appartient pas à Facebook et n’est pas affilié à Facebook Inc. Le contenu de ce site web n’a pas été vérifié par Facebook.</p>
        <p className="mt-2">Ce site n’appartient pas à YouTube et n’est pas affilié à Google. Le contenu de ce site web n’a pas été vérifié par Google.</p>
        <p className="mt-3 text-white/60">Roméo Moumouni — Tous droits réservés</p>
      </footer>

      {/* MODALE DE PAIEMENT */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={() => !busy && setModal(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-ink" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-ink">
              Rejoindre en {modal === '1x' ? '1X (98.000 FCFA)' : '3X (65.000 FCFA × 2)'}
            </h3>
            <p className="mt-1 text-sm text-muted">Renseigne tes infos, tu es redirigé vers le paiement.</p>
            <div className="mt-4 space-y-3">
              <input className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-[#2f7bdc] focus:ring-4 focus:ring-[#2f7bdc]/15" type="email" placeholder="Ton adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-[#2f7bdc] focus:ring-4 focus:ring-[#2f7bdc]/15" type="text" placeholder="Ton nom (optionnel)" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="grid grid-cols-[1fr_130px] gap-2">
                <input className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-[#2f7bdc] focus:ring-4 focus:ring-[#2f7bdc]/15" type="tel" inputMode="numeric" placeholder="Numéro Mobile Money" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <select className="w-full rounded-xl border border-line px-2 py-2.5 text-sm outline-none focus:border-[#2f7bdc]" value={country} onChange={(e) => setCountry(e.target.value)}>
                  {COUNTRIES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
                </select>
              </div>
            </div>
            {err && <p className="mt-3 text-sm font-medium text-red-600">{err}</p>}
            <button onClick={pay} disabled={busy} className="mt-5 w-full rounded-xl bg-[#2f7bdc] py-3.5 text-sm font-extrabold uppercase text-white transition hover:bg-[#1f63c4] disabled:opacity-60">
              {busy ? 'Redirection…' : 'Payer maintenant'}
            </button>
            <button onClick={() => !busy && setModal(null)} className="mt-2 w-full py-2 text-sm font-semibold text-muted">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
