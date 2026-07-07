'use client';

// Super Coach Roméo — chat IA façon ChatGPT/Claude : photo de Roméo au centre,
// réponses immédiates en streaming, historique conservé, rendu RichText.

import { useEffect, useRef, useState } from 'react';
import RichText from '@/components/RichText';
import Avatar from '@/components/Avatar';
import { IconSparkle, IconArrowRight } from '@/components/Icons';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  'Comment trouver mes premiers clients ?',
  'Par quel cours je devrais commencer ?',
  'Comment bien démarrer sur Comeup ?',
  'Donne-moi un plan pour contacter 100 prospects',
];

// Pays Mobile Money proposés pour le paiement direct
const PAYS = [
  { code: 'BJ', label: 'Bénin' },
  { code: 'CI', label: "Côte d'Ivoire" },
  { code: 'SN', label: 'Sénégal' },
  { code: 'TG', label: 'Togo' },
  { code: 'CM', label: 'Cameroun' },
  { code: 'BF', label: 'Burkina Faso' },
  { code: 'ML', label: 'Mali' },
  { code: 'NE', label: 'Niger' },
  { code: 'GN', label: 'Guinée' },
  { code: 'CD', label: 'RD Congo' },
  { code: 'GA', label: 'Gabon' },
  { code: 'FR', label: 'France / carte' },
];

function RechargePanel({ email }: { email: string }) {
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('BJ');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pay() {
    const num = phone.replace(/\D/g, '');
    if (num.length < 6) return setErr('Entre ton numéro de téléphone (Mobile Money).');
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/super-coach/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: num, country }),
      });
      const j = await res.json().catch(() => null);
      if (j?.url) {
        // Redirection directe vers la page de PAIEMENT (pas la boutique)
        window.location.href = j.url;
        return;
      }
      if (j?.fallback) {
        window.location.href = j.fallback;
        return;
      }
      setErr(j?.error ?? 'Impossible de préparer le paiement, réessaie.');
      setBusy(false);
    } catch {
      setErr('Impossible de préparer le paiement, réessaie.');
      setBusy(false);
    }
  }

  return (
    <div className="card mt-4 p-5">
      <p className="text-center font-bold text-ink">Tu as utilisé toutes tes questions IA 🔋</p>
      <p className="mx-auto mt-1 max-w-sm text-center text-sm leading-relaxed text-muted">
        Recharge <b className="text-ink">15 questions pour 1 500 FCFA</b> — paiement direct
        (Mobile Money ou carte), tes questions s&apos;ajoutent automatiquement sur{' '}
        <b className="text-ink">{email}</b>.
      </p>

      <div className="mx-auto mt-4 flex max-w-sm flex-col gap-2 sm:flex-row">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="input sm:w-40"
          disabled={busy}
        >
          {PAYS.map((p) => (
            <option key={p.code} value={p.code}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input flex-1"
          placeholder="Numéro de téléphone"
          disabled={busy}
        />
      </div>

      {err && <p className="mt-2 text-center text-sm text-red-600">{err}</p>}

      <button onClick={pay} disabled={busy} className="btn-primary mx-auto mt-3 w-full max-w-sm disabled:opacity-60">
        {busy ? 'Préparation du paiement…' : 'Payer 1 500 FCFA — recharger 15 questions'}
        {!busy && <IconArrowRight width={17} height={17} />}
      </button>
      <button onClick={() => window.location.reload()} className="btn-outline mx-auto mt-2 flex w-full max-w-sm justify-center">
        J&apos;ai payé — actualiser
      </button>
    </div>
  );
}

function CoachFace({ src, size }: { src: string | null; size: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt="Roméo"
        width={size}
        height={size}
        className="rounded-full object-cover ring-2 ring-line"
        style={{ width: size, height: size }}
      />
    );
  }
  return <Avatar initials="R" size={size} />;
}

export default function SuperCoachClient({
  me,
  coachAvatar,
  history,
  remaining,
}: {
  me: { name: string; email: string };
  coachAvatar: string | null;
  history: Msg[];
  remaining: number;
}) {
  const [messages, setMessages] = useState<Msg[]>(history);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [quotaOut, setQuotaOut] = useState(remaining <= 0);
  const [left, setLeft] = useState(remaining);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);

  // Si l'élève quitte la page pendant une réponse, on coupe le flux proprement.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setErr(null);
    setInput('');
    setBusy(true);
    setMessages((m) => [...m, { role: 'user', content: q }, { role: 'assistant', content: '' }]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch('/api/super-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
        signal: ctrl.signal,
      });
      if (res.status === 402) {
        // Quota de questions IA épuisé -> panneau de recharge
        setMessages((m) => m.slice(0, -2));
        setInput(q);
        setQuotaOut(true);
        setLeft(0);
        setBusy(false);
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? 'Le Super Coach est indisponible, réessaie.');
      }
      const remHeader = res.headers.get('x-questions-remaining');
      if (remHeader !== null) setLeft(Math.max(0, parseInt(remHeader, 10) || 0));
      if (!res.body) throw new Error('Réponse vide du serveur, réessaie.');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: 'assistant',
            content: copy[copy.length - 1].content + chunk,
          };
          return copy;
        });
      }
    } catch (e) {
      // Départ de la page pendant la réponse : abandon volontaire, pas une erreur.
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setMessages((m) => m.slice(0, -2)); // retire la question + la bulle vide
      setInput(q); // remet la question dans le champ
      setErr(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col" style={{ minHeight: 'calc(100vh - 140px)' }}>
      {/* En-tête */}
      <div className="mb-4 flex items-center gap-3">
        <CoachFace src={coachAvatar} size={44} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
            Super Coach Roméo
            <span className="chip bg-ink text-white">
              <IconSparkle width={12} height={12} /> IA
            </span>
          </p>
          <p className="text-xs text-muted">
            Réponses immédiates, 24h/24 — plus rapide que les coachs (tu as droit à 15 questions gratuites).
          </p>
        </div>
      </div>

      <p className="mb-4 rounded-lg border border-line bg-white px-3.5 py-2.5 text-xs leading-relaxed text-muted">
        Tu parles à une <b className="text-ink">super IA entraînée sur les connaissances de Roméo</b> (cours,
        méthodes, conseils). Elle te répond instantanément. Pour parler à un humain, passe par « Contacter
        les coachs » ou le « Suivi hebdomadaire ».
      </p>

      {/* Fil de discussion */}
      <div className="flex-1 space-y-4">
        {empty ? (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <CoachFace src={coachAvatar} size={96} />
            <p className="mt-4 text-lg font-bold text-ink">Salut {me.name.split(' ')[0]} 👋</p>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">
              Pose-moi n&apos;importe quelle question sur le freelancing ou le programme : je réponds
              tout de suite.
            </p>
            <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="card p-3 text-left text-sm text-ink transition hover:border-[#e0e0de] hover:shadow-soft"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex items-start gap-2.5 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && (
                <span className="mt-0.5 shrink-0">
                  <CoachFace src={coachAvatar} size={30} />
                </span>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user' ? 'bg-ink text-white' : 'card text-ink'
                }`}
              >
                {m.content ? (
                  <p className="whitespace-pre-line">
                    <RichText text={m.content} onDark={m.role === 'user'} />
                  </p>
                ) : (
                  <span className="inline-flex gap-1 py-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:240ms]" />
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      {/* Quota épuisé : panneau de recharge (paiement direct) */}
      {quotaOut && <RechargePanel email={me.email} />}

      {/* Composer (collant en bas) */}
      <div className="sticky bottom-0 mt-4 border-t border-line bg-surface pb-2 pt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            className="input max-h-40 min-h-[46px] flex-1 resize-none"
            placeholder="Pose ta question au Super Coach…"
            disabled={busy}
          />
          <button
            onClick={() => send()}
            disabled={busy || !input.trim()}
            className="btn-primary h-[46px] disabled:opacity-60"
            aria-label="Envoyer"
          >
            <IconArrowRight width={18} height={18} />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted">
          {left >= 9999
            ? 'Le Super Coach est une IA : pour une réponse personnalisée, passe par le suivi hebdomadaire.'
            : `Questions IA restantes : ${left} · Les salutations ne comptent pas · Recharge : 1 500 FCFA = 15 questions`}
        </p>
      </div>
    </div>
  );
}
