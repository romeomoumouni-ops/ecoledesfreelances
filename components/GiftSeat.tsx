'use client';

// Bonus « paiement en une fois » : offrir sa place à UNE personne, une seule
// fois, irrévocable. Carte bien visible sur le tableau de bord.

import { useState } from 'react';
import { verifierEmail } from '@/lib/email-check';

export type GiftStatus = { eligible: boolean; used: boolean; invitee_email: string | null; used_at: string | null };

export default function GiftSeat({ initial }: { initial: GiftStatus }) {
  const [status, setStatus] = useState(initial);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!status.eligible) return null;

  const verif = verifierEmail(email);
  const sameTwice = email.trim().toLowerCase() === confirm.trim().toLowerCase();
  const canSubmit = verif.etat === 'ok' && sameTwice && !busy;

  async function give() {
    if (!canSubmit) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Impossible d’offrir la place.');
      setStatus({ eligible: true, used: true, invitee_email: j.invitee_email, used_at: new Date().toISOString() });
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Impossible d’offrir la place.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="mb-4 overflow-hidden rounded-2xl border-2 border-red-500 bg-red-50 shadow-soft sm:mb-5">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              🎁 Bonus premium · 1 place offerte
            </p>
            {status.used ? (
              <>
                <h2 className="mt-3 text-lg font-bold text-ink">Tu as offert ta place</h2>
                <p className="mt-1 text-sm text-muted">
                  Accès à vie donné à <b className="text-ink">{status.invitee_email}</b>. Cette personne a reçu un
                  e-mail pour créer son compte.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-lg font-bold text-ink">Offre l’école à un proche — gratuitement</h2>
                <p className="mt-1 max-w-xl text-sm text-muted">
                  Parce que tu as rejoint en une fois, tu peux donner <b className="text-ink">l’accès à vie</b> à
                  <b className="text-ink"> une seule personne</b> de ton choix. Un seul essai : choisis bien.
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => !status.used && setOpen(true)}
            disabled={status.used}
            className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition ${
              status.used
                ? 'cursor-not-allowed bg-black/[0.06] text-muted'
                : 'bg-red-600 text-white shadow-lg hover:bg-red-700'
            }`}
          >
            {status.used ? 'Place déjà offerte ✓' : 'Offrir ma place →'}
          </button>
        </div>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => !busy && setOpen(false)}
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-red-600 px-6 py-5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/70">Place offerte</p>
              <h3 className="mt-1 text-xl font-bold">À qui offres-tu l’accès ?</h3>
            </div>
            <div className="p-6">
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm leading-relaxed text-red-800">
                <b>⚠️ Attention, c’est définitif.</b> Tu n’as qu’une seule place à offrir. Une fois donnée, elle ne
                peut ni être reprise ni transférée — même si l’adresse contient une faute de frappe. Vérifie-la deux fois.
              </div>

              <label className="mt-4 block text-xs font-semibold text-muted">Adresse e-mail de la personne</label>
              <input
                autoFocus
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="prenom@exemple.com"
                className={`input mt-1 w-full text-[16px] sm:text-sm ${touched && verif.etat !== 'ok' && verif.etat !== 'vide' ? 'border-red-400' : ''}`}
              />
              {touched && verif.etat === 'invalide' && <p className="mt-1 text-xs font-semibold text-red-600">⚠ {verif.message}</p>}
              {touched && verif.etat === 'suspect' && (
                <p className="mt-1 text-xs font-semibold text-amber-700">
                  ⚠ {verif.message}{' '}
                  <button type="button" onClick={() => { setEmail(verif.suggestion); setConfirm(''); }} className="underline">Oui, corrige</button>
                </p>
              )}

              <label className="mt-3 block text-xs font-semibold text-muted">Retape l’adresse pour confirmer</label>
              <input
                type="email"
                inputMode="email"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                placeholder="La même adresse, sans copier-coller"
                className={`input mt-1 w-full text-[16px] sm:text-sm ${confirm && !sameTwice ? 'border-red-400' : ''}`}
              />
              {confirm && !sameTwice && <p className="mt-1 text-xs font-semibold text-red-600">⚠ Les deux adresses ne sont pas identiques.</p>}

              {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{err}</p>}

              <button
                onClick={give}
                disabled={!canSubmit}
                className="mt-5 w-full rounded-xl bg-red-600 py-3.5 text-sm font-bold uppercase tracking-tight text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? 'Activation…' : 'Donner l’accès à cette personne'}
              </button>
              <button onClick={() => !busy && setOpen(false)} className="mt-2 w-full py-2 text-sm font-semibold text-muted">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
