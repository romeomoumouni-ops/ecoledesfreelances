'use client';

// Double authentification (2FA) — facultative, réservée aux administrateurs.
// L'admin l'active lui-même : il scanne un QR code avec une application
// d'authentification (Google Authenticator, Authy…) puis confirme un code.
// À la prochaine connexion, un code à 6 chiffres sera demandé après le mot de passe.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IconShield, IconCheckCircle } from '@/components/Icons';

const supabase = createClient();

type Enroll = { factorId: string; qr: string; secret: string };

export default function TwoFactorAdmin() {
  const [status, setStatus] = useState<'loading' | 'off' | 'on'>('loading');
  const [enroll, setEnroll] = useState<Enroll | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = (data?.totp ?? []).some((f) => f.status === 'verified');
    setStatus(verified ? 'on' : 'off');
  }

  useEffect(() => {
    refresh();
  }, []);

  async function startEnroll() {
    setErr(null);
    setBusy(true);
    try {
      // Nettoie d'éventuels facteurs non confirmés d'une tentative précédente
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.totp ?? []) {
        if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator ${Date.now()}`,
        issuer: "L'École des Freelances",
      });
      if (error) throw error;
      setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Impossible de démarrer l'activation. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!enroll) return;
    setErr(null);
    setBusy(true);
    const { error: vErr } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enroll.factorId,
      code: code.trim(),
    });
    setBusy(false);
    if (vErr) {
      setErr(
        'Code refusé. Vérifie que tu tapes le code EN COURS dans ton application, et que l’heure de ton téléphone est réglée sur « automatique ».'
      );
      return;
    }
    setEnroll(null);
    setCode('');
    setStatus('on');
  }

  async function disable() {
    if (!window.confirm('Désactiver la double authentification sur ton compte ?')) return;
    setErr(null);
    setBusy(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      for (const f of data?.totp ?? []) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
        if (error) throw error;
      }
    } catch {
      setErr('La désactivation a échoué (session récente requise). Déconnecte-toi, reconnecte-toi, puis réessaie.');
    } finally {
      setBusy(false);
      // On affiche l'état RÉEL : si un facteur n'a pas pu être retiré, le badge reste « Activée ».
      await refresh();
    }
  }

  return (
    <div className="mt-8 border-t border-line pt-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/[0.05] text-ink">
          <IconShield width={18} height={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
            Double authentification (2FA)
            <span className="chip bg-black/[0.05] text-muted">Admin</span>
            {status === 'on' && (
              <span className="chip bg-green-50 text-green-700">
                <IconCheckCircle width={13} height={13} /> Activée
              </span>
            )}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Ajoute un code à 6 chiffres (application d&apos;authentification) demandé à la connexion, en plus
            de ton mot de passe. Fortement recommandé pour un compte admin.
          </p>
        </div>
      </div>

      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      {status === 'loading' ? (
        <p className="mt-4 text-sm text-muted">Chargement…</p>
      ) : enroll ? (
        <div className="mt-4 rounded-xl border border-line p-4">
          <p className="text-sm font-semibold text-ink">1. Scanne ce QR code</p>
          <p className="mb-3 text-xs text-muted">
            Avec Google Authenticator, Authy ou Microsoft Authenticator.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="QR code 2FA" className="h-44 w-44 rounded-lg border border-line bg-white" />
          <p className="mt-2 text-xs text-muted">
            Ou saisis la clé manuellement : <code className="rounded bg-black/[0.05] px-1.5 py-0.5 text-ink">{enroll.secret}</code>
          </p>
          <p className="mt-4 text-sm font-semibold text-ink">2. Entre le code affiché</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="input text-center tracking-[0.3em] sm:max-w-[160px]"
              placeholder="000000"
            />
            <button onClick={confirm} disabled={busy || code.length < 6} className="btn-primary disabled:opacity-60">
              {busy ? 'Vérification…' : 'Activer la 2FA'}
            </button>
            <button onClick={() => { setEnroll(null); setCode(''); setErr(null); }} className="btn-outline">
              Annuler
            </button>
          </div>
        </div>
      ) : status === 'on' ? (
        <button onClick={disable} disabled={busy} className="btn-outline mt-4 disabled:opacity-60">
          {busy ? 'Désactivation…' : 'Désactiver la 2FA'}
        </button>
      ) : (
        <button onClick={startEnroll} disabled={busy} className="btn-primary mt-4 disabled:opacity-60">
          {busy ? '…' : 'Activer la double authentification'}
        </button>
      )}
    </div>
  );
}
