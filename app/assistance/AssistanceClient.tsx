'use client';

// Assistant d'accès public : un seul rôle, donner les accès aux personnes qui
// ont DÉJÀ payé. La personne donne l'adresse e-mail de son achat, l'assistant
// vérifie le paiement (notre base, puis Chariow en direct) et lui donne les
// consignes. Pas payé → lien de paiement. Autre sujet → recentrage.
// Les réponses sont fixes (pas d'IA générative) ; tout est journalisé côté serveur.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Logo from '@/components/Logo';

const SITE = 'https://www.lecoledesfreelances.com';
const WHATSAPP = 'https://wa.me/2290157342814';
const PAY_LINK = 'https://www.romeomoumouni.com/rejoindre-ecole-des-freelances';

type Mood = 'idle' | 'thinking' | 'happy' | 'sad';
type Msg = { id: number; role: 'user' | 'bot'; content: ReactNode };

type ApiResult = {
  kind: 'paid_new' | 'paid_account' | 'expired' | 'not_found' | 'ask_email' | 'pay_link' | 'recentrage' | 'invalid' | 'too_many';
  email?: string;
  email_sent?: boolean;
  suggestions?: string[];
};

let nextId = 1;

/* ─────────────── Mascotte animée ─────────────── */
function Mascot({ mood, size = 120 }: { mood: Mood; size?: number }) {
  return (
    <svg
      viewBox="0 0 120 130"
      width={size}
      height={size * (130 / 120)}
      className={`mascot mascot-${mood}`}
      role="img"
      aria-label="Assistant de L'École des Freelances"
    >
      {/* ombre */}
      <ellipse className="mascot-shadow" cx="60" cy="124" rx="30" ry="4" fill="#000" opacity="0.08" />
      <g className="mascot-body">
        {/* antenne */}
        <line x1="60" y1="14" x2="60" y2="26" stroke="#1d1d1f" strokeWidth="3" strokeLinecap="round" />
        <circle className="mascot-light" cx="60" cy="11" r="5" fill="#2f6bff" />
        {/* tête */}
        <rect x="22" y="26" width="76" height="58" rx="22" fill="#ffffff" stroke="#1d1d1f" strokeWidth="3" />
        <rect x="31" y="36" width="58" height="36" rx="14" fill="#1d1d1f" />
        {/* yeux */}
        <g className="mascot-eyes">
          {mood === 'happy' ? (
            <>
              <path d="M42 56 q6 -8 12 0" stroke="#7cf5c4" strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M66 56 q6 -8 12 0" stroke="#7cf5c4" strokeWidth="4" fill="none" strokeLinecap="round" />
            </>
          ) : mood === 'sad' ? (
            <>
              <path d="M42 52 q6 6 12 0" stroke="#9db8ff" strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M66 52 q6 6 12 0" stroke="#9db8ff" strokeWidth="4" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle className="mascot-eye" cx="48" cy="54" r="6" fill="#7cf5c4" />
              <circle className="mascot-eye" cx="72" cy="54" r="6" fill="#7cf5c4" />
            </>
          )}
        </g>
        {/* joues */}
        <circle cx="36" cy="76" r="4" fill="#ffb3c7" opacity="0.8" />
        <circle cx="84" cy="76" r="4" fill="#ffb3c7" opacity="0.8" />
        {/* corps */}
        <rect x="36" y="86" width="48" height="28" rx="12" fill="#2f6bff" stroke="#1d1d1f" strokeWidth="3" />
        <circle cx="60" cy="100" r="5" fill="#ffffff" />
        {/* bras */}
        <path className="mascot-arm-left" d="M36 94 q-12 4 -14 14" stroke="#1d1d1f" strokeWidth="3" fill="none" strokeLinecap="round" />
        <g className="mascot-arm-right">
          <path d="M84 94 q12 -6 16 -18" stroke="#1d1d1f" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="100" cy="74" r="5" fill="#ffffff" stroke="#1d1d1f" strokeWidth="3" />
        </g>
      </g>
    </svg>
  );
}

const MASCOT_CSS = `
.mascot-body{animation:m-float 3.2s ease-in-out infinite;transform-origin:60px 70px}
.mascot-shadow{animation:m-shadow 3.2s ease-in-out infinite;transform-origin:60px 124px}
.mascot-eye{animation:m-blink 4.5s infinite;transform-box:fill-box;transform-origin:center}
.mascot-light{animation:m-pulse 1.8s ease-in-out infinite}
.mascot-arm-right{animation:m-wave 2.4s ease-in-out infinite;transform-origin:84px 94px}
.mascot-thinking .mascot-eyes{animation:m-look 1.2s ease-in-out infinite}
.mascot-thinking .mascot-light{animation:m-pulse .5s ease-in-out infinite}
.mascot-thinking .mascot-arm-right{animation:none}
.mascot-happy .mascot-body{animation:m-jump .9s ease-in-out 2,m-float 3.2s ease-in-out .9s infinite}
.mascot-happy .mascot-arm-right{animation:m-wave .5s ease-in-out infinite}
.mascot-sad .mascot-arm-right{animation:none;transform:rotate(60deg)}
@keyframes m-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes m-shadow{0%,100%{transform:scaleX(1);opacity:.08}50%{transform:scaleX(.8);opacity:.05}}
@keyframes m-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes m-pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes m-wave{0%,100%{transform:rotate(0)}50%{transform:rotate(-18deg)}}
@keyframes m-look{0%,100%{transform:translateX(-4px)}50%{transform:translateX(4px)}}
@keyframes m-jump{0%,100%{transform:translateY(0)}40%{transform:translateY(-16px)}}
@keyframes m-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.msg-in{animation:m-in .25s ease-out}
@media (prefers-reduced-motion: reduce){.mascot *, .msg-in{animation:none!important}}
`;

/* ─────────────── Blocs de réponse ─────────────── */
function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="mt-3 space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-bold text-white">{i + 1}</span>
          <span className="pt-0.5">{it}</span>
        </li>
      ))}
    </ol>
  );
}

function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="mt-1.5 inline-flex max-w-full items-center gap-1 break-all rounded-lg bg-violet-600 px-3 py-2 text-[13px] font-bold text-white no-underline hover:bg-violet-700"
    >
      {children}
    </a>
  );
}

type Send = (text: string, intent?: 'paid_yes' | 'paid_no') => void;

/** Question « As-tu déjà payé ? » avec réponses en un clic. */
function OuiNon({ send }: { send: Send }) {
  return (
    <div className="mt-3">
      <p className="font-semibold">As-tu déjà effectué ton paiement ?</p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => send('Oui, j’ai déjà payé', 'paid_yes')}
          className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-bold text-ink hover:bg-black/[0.03]"
        >
          Oui
        </button>
        <button
          onClick={() => send('Non, pas encore', 'paid_no')}
          className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-bold text-ink hover:bg-black/[0.03]"
        >
          Non, pas encore
        </button>
      </div>
    </div>
  );
}

function reponse(r: ApiResult, send: Send): { mood: Mood; content: ReactNode } {
  const email = r.email ?? '';
  const mail = <b className="break-all">{email}</b>;
  const envoye = r.email_sent ? (
    <p className="mt-3 text-[13px] text-muted">📩 Je t&apos;ai aussi envoyé ces consignes par e-mail. Pense à regarder dans tes spams.</p>
  ) : null;

  switch (r.kind) {
    case 'paid_new':
      return {
        mood: 'happy',
        content: (
          <div>
            <p>Bonne nouvelle 🎉 <b>Ton paiement est bien confirmé</b> pour {mail}. Voici comment entrer sur la plateforme :</p>
            <Steps
              items={[
                <>Ouvre la page de création de compte :<br /><LinkButton href={`${SITE}/inscription`}>lecoledesfreelances.com/inscription →</LinkButton></>,
                <>Inscris-toi avec <b>l&apos;adresse e-mail de ton achat</b>, exactement celle-ci : {mail}</>,
                <><b>Crée ton mot de passe</b> et note-le bien, tu en auras besoin à chaque connexion.</>,
                <>C&apos;est tout : tu entres directement dans la plateforme et tu peux commencer tes cours 🚀</>,
              ]}
            />
            {envoye}
          </div>
        ),
      };
    case 'paid_account':
      return {
        mood: 'happy',
        content: (
          <div>
            <p><b>Ton paiement est bien confirmé</b> pour {mail}, et ton compte existe déjà 👍 Pour entrer sur la plateforme :</p>
            <Steps
              items={[
                <>Ouvre la page de connexion :<br /><LinkButton href={`${SITE}/connexion`}>lecoledesfreelances.com/connexion →</LinkButton></>,
                <>Connecte-toi avec <b>l&apos;adresse e-mail de ton achat</b> : {mail}</>,
                <>Saisis <b>le mot de passe que tu as créé</b> lors de ton inscription.</>,
                <>Tu arrives sur ton tableau de bord, et tu peux reprendre tes cours 🚀</>,
              ]}
            />
            <p className="mt-3 text-[13px] text-muted">
              Mot de passe oublié ? Écris à l&apos;équipe sur{' '}
              <a href={WHATSAPP} className="font-semibold text-ink underline">WhatsApp</a>.
            </p>
            {envoye}
          </div>
        ),
      };
    case 'expired':
      return {
        mood: 'idle',
        content: (
          <div>
            <p>Ton paiement est bien enregistré pour {mail} 👍 Mais <b>une échéance de ta formule en plusieurs fois est à régler</b>.</p>
            <p className="mt-2">Connecte-toi : le bouton pour payer ta tranche t&apos;attend, et ton accès se rouvre tout seul juste après.</p>
            <LinkButton href={`${SITE}/connexion`}>Me connecter →</LinkButton>
          </div>
        ),
      };
    case 'not_found':
      return {
        mood: 'sad',
        content: (
          <div>
            <p>Je ne trouve aucun paiement avec {mail} 😕</p>
            {r.suggestions?.length ? (
              <div className="mt-2">
                <p>Tu voulais peut-être écrire :</p>
                <div className="mt-1.5 flex flex-col gap-1.5">
                  {r.suggestions.map((sug) => (
                    <button
                      key={sug}
                      onClick={() => send(sug)}
                      className="break-all rounded-lg border border-line bg-white px-3 py-2 text-left text-[13px] font-semibold text-ink hover:bg-black/[0.03]"
                    >
                      Oui, c&apos;est {sug}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <OuiNon send={send} />
          </div>
        ),
      };
    case 'ask_email':
      return {
        mood: 'idle',
        content: (
          <p>
            D&apos;accord ! Donne-moi <b>l&apos;adresse e-mail avec laquelle tu as effectué ton paiement</b>. Tu la retrouves sur le reçu
            envoyé par e-mail juste après ton paiement.
          </p>
        ),
      };
    case 'pay_link':
      return {
        mood: 'idle',
        content: (
          <div>
            <p>Pour rejoindre l&apos;incubateur, <b>effectue d&apos;abord ton paiement</b> ici :</p>
            <LinkButton href={PAY_LINK}>Rejoindre L&apos;École des Freelances →</LinkButton>
            <p className="mt-2">Une fois ton paiement fait, reviens ici et donne-moi l&apos;adresse e-mail utilisée : je te donne tes accès tout de suite.</p>
          </div>
        ),
      };
    case 'recentrage':
      return {
        mood: 'idle',
        content: (
          <div>
            <p>Je suis ici pour donner les accès aux personnes qui ont <b>déjà payé</b> pour rejoindre l&apos;incubateur.</p>
            <p className="mt-2">Si tu n&apos;as pas encore effectué ton paiement, effectue-le avant :</p>
            <LinkButton href={PAY_LINK}>Effectuer mon paiement →</LinkButton>
            <p className="mt-2">Si tu as déjà effectué ton paiement, donne-moi <b>le mail avec lequel tu as effectué ton paiement</b>.</p>
          </div>
        ),
      };
    case 'too_many':
      return {
        mood: 'sad',
        content: <p>Tu as envoyé beaucoup de messages d&apos;un coup. Patiente quelques minutes, ou écris à l&apos;équipe sur <a href={WHATSAPP} className="font-semibold underline">WhatsApp</a>.</p>,
      };
    default:
      return { mood: 'idle', content: <p>Cette adresse ne semble pas correcte. Peux-tu la retaper ? Exemple : prenom@gmail.com</p> };
  }
}

const ACCUEIL: ReactNode = (
  <div>
    <p>Bonjour 👋 Je suis l&apos;assistant d&apos;accès de <b>L&apos;École des Freelances</b>.</p>
    <p className="mt-2">Donne-moi <b>l&apos;adresse e-mail que tu as utilisée pour ton achat</b>. Je vérifie ton paiement tout de suite et je t&apos;explique comment entrer sur la plateforme.</p>
    <p className="mt-2">Si tu n&apos;as pas encore effectué ton paiement, effectue-le d&apos;abord ici, puis reviens me voir :</p>
    <LinkButton href={PAY_LINK}>Rejoindre L&apos;École des Freelances →</LinkButton>
  </div>
);

export default function AssistanceClient() {
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, role: 'bot', content: ACCUEIL }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [mood, setMood] = useState<Mood>('idle');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const started = msgs.length > 1;

  useEffect(() => {
    if (msgs.length > 1 || busy) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, busy]);

  const push = (role: Msg['role'], content: ReactNode) => setMsgs((m) => [...m, { id: nextId++, role, content }]);

  async function envoyer(text: string, intent?: 'paid_yes' | 'paid_no') {
    const t = text.trim();
    if (!t || busyRef.current) return;
    busyRef.current = true;
    setInput('');
    push('user', t);
    setBusy(true);
    setMood('thinking');
    const debut = Date.now();
    let r: ApiResult | null = null;
    try {
      const res = await fetch('/api/assistance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: t, intent }),
      });
      r = (await res.json()) as ApiResult;
      if (!r?.kind) r = null;
    } catch {
      r = null;
    }
    // Un court temps de « réflexion » : la réponse paraît moins brutale.
    await new Promise((res) => setTimeout(res, Math.max(0, 900 - (Date.now() - debut))));
    if (r) {
      const out = reponse(r, envoyer);
      push('bot', out.content);
      setMood(out.mood);
    } else {
      push('bot', <p>Petit souci de connexion de mon côté. Réessaie dans un instant 🙏</p>);
      setMood('sad');
    }
    busyRef.current = false;
    setBusy(false);
    inputRef.current?.focus();
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#f7f7f5]">
      <style dangerouslySetInnerHTML={{ __html: MASCOT_CSS }} />
      <header className="border-b border-line bg-white/85 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-center">
          <Logo />
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4 pb-3 pt-3">
        <div className={`flex items-center text-center ${started ? "flex-row justify-center gap-3 text-left" : "flex-col"}`}>
          <Mascot mood={mood} size={started ? 52 : 104} />
          <div>
          <h1 className={`font-bold text-ink ${started ? "text-base sm:text-lg" : "mt-1 text-xl sm:text-2xl"}`}>Ton assistant d&apos;accès</h1>
          <p className={`text-muted ${started ? "text-xs" : "mt-1 text-sm"}`}>
            {busy ? 'Je vérifie ton paiement…' : 'Vérifie ton paiement et entre sur la plateforme en 1 minute.'}
          </p>
          </div>
        </div>

        <div className="card mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:p-4" aria-live="polite">
            {msgs.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="msg-in flex justify-end">
                  <div className="max-w-[85%] break-all rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-white">{m.content}</div>
                </div>
              ) : (
                <div key={m.id} className="msg-in flex items-end gap-2">
                  <div className="shrink-0"><Mascot mood="idle" size={30} /></div>
                  <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-black/[0.05] px-4 py-3 text-sm leading-relaxed text-ink">{m.content}</div>
                </div>
              )
            )}
            {busy && (
              <div className="msg-in flex items-end gap-2">
                <div className="shrink-0"><Mascot mood="thinking" size={30} /></div>
                <div className="rounded-2xl rounded-bl-md bg-black/[0.05] px-4 py-3 text-sm text-muted">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:240ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="border-t border-line bg-white p-3"
            onSubmit={(e) => {
              e.preventDefault();
              envoyer(input);
            }}
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                type="text"
                inputMode="text"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                maxLength={200}
                className="input h-11 min-w-0 flex-1 text-[16px] sm:text-sm"
                placeholder="L'e-mail de ton paiement…"
              />
              <button type="submit" disabled={busy || !input.trim()} className="btn-primary h-11 shrink-0 px-4 disabled:opacity-60">
                Envoyer
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted">On ne te demandera jamais de mot de passe ni de numéro de carte.</p>
          </form>
        </div>

        <p className="mt-3 text-center text-xs text-muted">
          Besoin d&apos;un humain ? WhatsApp :{' '}
          <a href={WHATSAPP} className="font-semibold text-ink underline">+229 01 57 34 28 14</a>
        </p>
      </main>
    </div>
  );
}
