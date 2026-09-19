'use client';

// Guichet public d'accès : la personne discute avec l'IA qui vérifie son
// paiement et lui envoie ses accès. Aucune connexion nécessaire.

import { useEffect, useRef, useState } from 'react';
import Logo from '@/components/Logo';

type Msg = { role: 'user' | 'assistant'; body: string };

const ACCUEIL =
  "Bonjour 👋 Je suis l'assistant d'accès de L'École des Freelances.\n\nTu as payé et tu n'as pas encore tes accès ? Donne-moi l'adresse e-mail que tu as utilisée au moment du paiement, je vérifie tout de suite.";

export default function SupportClient() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', body: ACCUEIL }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', body: text }]);
    setBusy(true);
    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const j = await res.json().catch(() => ({}));
      setMsgs((m) => [...m, { role: 'assistant', body: j.reply || j.error || 'Petit souci de mon côté, réessaie dans un instant.' }]);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', body: 'Connexion perdue. Réessaie dans un instant.' }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f7f7f5]">
      <header className="border-b border-line bg-white/85 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Logo />
          <a href="/connexion" className="text-sm font-semibold text-muted hover:text-ink">
            J&apos;ai déjà mes accès →
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-5">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Tu as payé et tu n&apos;as pas tes accès ?</h1>
          <p className="mt-1 text-sm text-muted">Vérification en 1 minute, sans te connecter.</p>
        </div>

        <div className="card flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user' ? 'bg-ink text-white' : 'bg-black/[0.05] text-ink'
                  }`}
                >
                  {m.body}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-black/[0.05] px-4 py-2.5 text-sm text-muted">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce">·</span>
                    <span className="animate-bounce [animation-delay:120ms]">·</span>
                    <span className="animate-bounce [animation-delay:240ms]">·</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-line bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                maxLength={1500}
                autoFocus
                className="input max-h-32 min-h-[44px] flex-1 resize-none py-2.5 text-[16px] sm:text-sm"
                placeholder="Ton adresse e-mail de paiement…"
              />
              <button onClick={send} disabled={busy || !input.trim()} className="btn-primary h-11 shrink-0 px-5 disabled:opacity-60">
                Envoyer
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted">
              On ne te demandera jamais de mot de passe ni de numéro de carte.
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Besoin d&apos;un humain ? WhatsApp :{' '}
          <a href="https://wa.me/2290157342814" className="font-semibold text-ink underline">+229 01 57 34 28 14</a>
        </p>
      </main>
    </div>
  );
}
