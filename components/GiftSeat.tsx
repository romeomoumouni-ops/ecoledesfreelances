'use client';

// Bonus « paiement en une fois » : offrir sa place à UNE personne, une seule
// fois, irrévocable. Pour être sûr que l'adresse est la bonne, un code à
// 6 chiffres est envoyé à l'invité : la place n'est donnée qu'avec ce code.

import { useEffect, useRef, useState } from 'react';
import { verifierEmail } from '@/lib/email-check';

export type GiftStatus = {
  eligible: boolean;
  used: boolean;
  invitee_email: string | null;
  used_at: string | null;
  invitee_registered?: boolean;
};

type Step = 'email' | 'code';

export default function GiftSeat({ initial, apercu = false }: { initial: GiftStatus; apercu?: boolean }) {
  const [status, setStatus] = useState(initial);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [resendMsg, setResendMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Après le don : la confirmation reste 1 minute puis la carte disparaît.
  // Aux visites suivantes, elle ne revient que si l'invité n'a pas encore créé
  // son compte (sous forme compacte, avec un bouton pour renvoyer l'e-mail).
  const [justGiven, setJustGiven] = useState(apercu);
  const [hidden, setHidden] = useState(initial.used && !apercu && initial.invitee_registered !== false);

  useEffect(() => {
    if (!justGiven) return;
    const t = setTimeout(() => setHidden(true), 60_000);
    return () => clearTimeout(t);
  }, [justGiven]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => () => stopPoll(), []);

  function stopPoll() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }

  // Surveille la livraison du code : si la messagerie le refuse, l'adresse
  // n'existe pas → on le dit tout de suite et on revient à la saisie.
  function startPoll() {
    stopPoll();
    let tours = 0;
    pollRef.current = setInterval(async () => {
      tours++;
      if (tours > 25) return stopPoll();
      try {
        const res = await fetch('/api/gift/code', { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        if (j.error) {
          stopPoll();
          setErr(j.error);
          setInfo('');
          setCode('');
          setConfirm('');
          setStep('email');
        } else if (j.status === 'delivered') {
          stopPoll();
          setInfo('Le code est bien arrivé dans la boîte de la personne.');
        }
      } catch { /* on réessaie au tour suivant */ }
    }, 4000);
  }

  if (!status.eligible || hidden) return null;

  const verif = verifierEmail(email);
  const sameTwice = email.trim().toLowerCase() === confirm.trim().toLowerCase();
  const canAskCode = verif.etat === 'ok' && sameTwice && !busy;
  const canGive = code.replace(/\D/g, '').length === 6 && !busy;

  async function askCode() {
    if (!canAskCode) return;
    setBusy(true);
    setErr('');
    setInfo('');
    try {
      const res = await fetch('/api/gift/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Impossible d’envoyer le code.');
      setStep('code');
      setCode('');
      setResendIn(45);
      startPoll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Impossible d’envoyer le code.');
    } finally {
      setBusy(false);
    }
  }

  async function give() {
    if (!canGive) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Impossible d’offrir la place.');
      stopPoll();
      setStatus({ eligible: true, used: true, invitee_email: j.invitee_email, used_at: new Date().toISOString(), invitee_registered: false });
      setJustGiven(true);
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Impossible d’offrir la place.');
    } finally {
      setBusy(false);
    }
  }

  async function resendAccess() {
    setBusy(true);
    setResendMsg('');
    try {
      const res = await fetch('/api/gift/resend', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      setResendMsg(res.ok ? `E-mail renvoyé à ${j.invitee_email}. Dis-lui de regarder aussi dans ses spams.` : j.error || 'Impossible de renvoyer l’e-mail.');
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    stopPoll();
    setOpen(false);
  }

  // Place déjà offerte, invité pas encore inscrit (visites suivantes) : carte compacte.
  if (status.used && !justGiven) {
    return (
      <section className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:mb-5">
        <p className="text-sm font-bold text-ink">🎁 Ton invité n’a pas encore créé son compte</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          L’accès à vie est actif pour <b className="text-ink break-all">{status.invitee_email}</b>. Il lui suffit de créer son
          compte sur <b className="text-ink">lecoledesfreelances.com/inscription</b> avec cette adresse exactement.
        </p>
        <button
          onClick={resendAccess}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50 sm:w-auto"
        >
          {busy ? 'Envoi…' : 'Renvoyer l’e-mail à mon invité'}
        </button>
        {resendMsg && <p className="mt-2 text-xs font-medium text-ink">{resendMsg}</p>}
      </section>
    );
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
                  Accès à vie donné à <b className="text-ink break-all">{status.invitee_email}</b>. Cette personne a reçu un
                  e-mail pour créer son compte. Ce message disparaîtra dans une minute.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-lg font-bold text-ink">Offre l’école à un proche, gratuitement</h2>
                <p className="mt-1 max-w-xl text-sm text-muted">
                  Parce que tu as rejoint en une fois, tu peux donner <b className="text-ink">l’accès à vie</b> à
                  <b className="text-ink"> une seule personne</b> de ton choix.
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => { if (!status.used) { setOpen(true); setErr(''); } }}
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
          onClick={close}
        >
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-red-600 px-6 py-5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/70">
                Place offerte · étape {step === 'email' ? '1' : '2'} sur 2
              </p>
              <h3 className="mt-1 text-xl font-bold">
                {step === 'email' ? 'À qui offres-tu l’accès ?' : 'Saisis le code de la personne'}
              </h3>
            </div>

            {step === 'email' ? (
              <div className="p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm leading-relaxed text-red-800">
                  <b>Tu n’as qu’une seule place à offrir.</b> Pour éviter toute erreur d’adresse, on envoie un code à la
                  personne. Ta place n’est donnée qu’une fois ce code saisi.
                </div>

                <label className="mt-4 block text-xs font-semibold text-muted">Adresse e-mail de la personne</label>
                <input
                  autoFocus
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErr(''); }}
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
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setErr(''); }}
                  onPaste={(e) => e.preventDefault()}
                  placeholder="La même adresse, sans copier-coller"
                  className={`input mt-1 w-full text-[16px] sm:text-sm ${confirm && !sameTwice ? 'border-red-400' : ''}`}
                />
                {confirm && !sameTwice && <p className="mt-1 text-xs font-semibold text-red-600">⚠ Les deux adresses ne sont pas identiques.</p>}

                {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{err}</p>}

                <button
                  onClick={askCode}
                  disabled={!canAskCode}
                  className="mt-5 w-full rounded-xl bg-red-600 py-3.5 text-sm font-bold uppercase tracking-tight text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? 'Vérification de l’adresse…' : 'Envoyer un code à cette personne'}
                </button>
                <button onClick={close} className="mt-2 w-full py-2 text-sm font-semibold text-muted">
                  Annuler
                </button>
              </div>
            ) : (
              <div className="p-6">
                <p className="text-sm leading-relaxed text-muted">
                  Un code à 6 chiffres vient d’être envoyé à <b className="text-ink break-all">{email.trim().toLowerCase()}</b>.
                  Demande à la personne de te le donner. S’il n’est pas dans sa boîte de réception, qu’elle regarde dans ses
                  spams ou l’onglet Promotions.
                </p>
                {info && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">✓ {info}</p>}

                <label className="mt-4 block text-xs font-semibold text-muted">Code reçu par la personne</label>
                <input
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr(''); }}
                  placeholder="123456"
                  className="input mt-1 w-full text-center text-2xl font-bold tracking-[0.4em]"
                />

                {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{err}</p>}

                <button
                  onClick={give}
                  disabled={!canGive}
                  className="mt-5 w-full rounded-xl bg-red-600 py-3.5 text-sm font-bold uppercase tracking-tight text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? 'Activation…' : 'Donner l’accès à cette personne'}
                </button>

                <div className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold">
                  <button
                    onClick={() => { stopPoll(); setStep('email'); setErr(''); setInfo(''); setConfirm(''); }}
                    disabled={busy}
                    className="text-muted underline"
                  >
                    Modifier l’adresse
                  </button>
                  <button
                    onClick={askCode}
                    disabled={busy || resendIn > 0}
                    className="text-ink underline disabled:text-muted disabled:no-underline"
                  >
                    {resendIn > 0 ? `Renvoyer le code (${resendIn} s)` : 'Renvoyer le code'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
