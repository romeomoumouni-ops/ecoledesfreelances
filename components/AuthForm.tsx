'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IconArrowRight, IconEye, IconEyeOff, IconShield } from '@/components/Icons';

export default function AuthForm() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState<false | 'login' | 'signup'>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Étape double authentification (2FA) : demandée après le mot de passe si activée
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [code, setCode] = useState('');

  function validate() {
    if (!email || !password) {
      setError('Renseignez votre e-mail et votre mot de passe.');
      return false;
    }
    return true;
  }

  // Si un facteur 2FA vérifié existe, on lance un challenge et on passe à l'étape code.
  async function maybeRequireMfa(): Promise<boolean> {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      if (totp) {
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
        if (chErr) throw chErr;
        setMfa({ factorId: totp.id, challengeId: ch.id });
        return true;
      }
    }
    return false;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!validate()) return;
    setLoading('login');
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) throw signErr;
      if (await maybeRequireMfa()) {
        setLoading(false);
        return; // on attend le code 2FA
      }
      router.replace('/tableau-de-bord');
      router.refresh();
    } catch (err) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  }

  async function verifyMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfa) return;
    setError(null);
    setLoading('login');
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: mfa.factorId,
      challengeId: mfa.challengeId,
      code: code.trim(),
    });
    if (vErr) {
      setError('Code incorrect ou expiré. Réessaie.');
      setLoading(false);
      return;
    }
    router.replace('/tableau-de-bord');
    router.refresh();
  }

  async function handleSignup() {
    setError(null);
    setMessage(null);
    if (!validate()) return;
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setLoading('signup');
    try {
      // Garde-fou : e-mail autorisé ? (admin / autorisé manuellement / acheteur)
      const { data: allowed, error: rpcError } = await supabase.rpc('is_email_allowed', {
        p_email: email,
      });
      if (rpcError) throw rpcError;
      if (allowed === false) {
        setError(
          "Cet e-mail n'est pas encore autorisé. Utilisez l'adresse liée à votre paiement."
        );
        return;
      }

      const { data, error: signErr } = await supabase.auth.signUp({ email, password });
      if (signErr) throw signErr;

      if (data.session) {
        router.replace('/tableau-de-bord');
        router.refresh();
      } else {
        setMessage(
          'Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.'
        );
      }
    } catch (err) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  }

  // Étape 2FA : demande du code de l'application d'authentification
  if (mfa) {
    return (
      <div className="w-full">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-black/[0.05] text-ink">
          <IconShield width={22} height={22} />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Vérification en deux étapes</h1>
        <p className="mt-1.5 text-sm text-muted">
          Entre le code à 6 chiffres affiché dans ton application d&apos;authentification.
        </p>
        <form onSubmit={verifyMfa} className="mt-6 space-y-4">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="input text-center text-lg tracking-[0.4em]"
            placeholder="000000"
            autoFocus
          />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading !== false || code.length < 6} className="btn-primary w-full disabled:opacity-60">
            {loading ? 'Vérification…' : 'Valider'}
            {!loading && <IconArrowRight width={18} height={18} />}
          </button>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              setMfa(null);
              setCode('');
              setError(null);
            }}
            className="btn-outline w-full"
          >
            Annuler
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Content de vous voir</h1>
      <p className="mt-1.5 text-sm text-muted">
        Connectez-vous, ou créez votre compte si vous venez de vous inscrire.
      </p>

      <form onSubmit={handleLogin} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Adresse e-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="vous@email.com"
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPwd ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-11"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted transition hover:text-ink"
              aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              tabIndex={-1}
            >
              {showPwd ? <IconEyeOff width={19} height={19} /> : <IconEye width={19} height={19} />}
            </button>
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {message && (
          <p className="rounded-lg bg-black/[0.04] px-3 py-2 text-sm text-ink">{message}</p>
        )}

        {/* Bouton principal : se connecter */}
        <button
          type="submit"
          disabled={loading !== false}
          className="btn-primary w-full disabled:opacity-60"
        >
          {loading === 'login' ? 'Connexion…' : 'Se connecter'}
          {loading !== 'login' && <IconArrowRight width={18} height={18} />}
        </button>

        {/* Second bouton : créer un compte, mis en évidence */}
        <button
          type="button"
          onClick={handleSignup}
          disabled={loading !== false}
          className="btn-accent w-full disabled:opacity-60"
        >
          {loading === 'signup' ? 'Création…' : 'Créer un compte'}
        </button>
        <p className="text-center text-xs text-muted">
          (Si vous venez de vous inscrire, créez votre compte avec l’e-mail utilisé
          lors de votre achat)
        </p>
      </form>
    </div>
  );
}

function translateError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou mot de passe incorrect.';
  if (/User already registered/i.test(msg))
    return 'Un compte existe déjà avec cet e-mail. Connectez-vous.';
  if (/Password should be at least/i.test(msg))
    return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (/Unable to validate email address|email_address_invalid/i.test(msg))
    return 'Adresse e-mail invalide.';
  if (/Email not confirmed/i.test(msg))
    return 'Veuillez confirmer votre e-mail (lien reçu par mail) avant de vous connecter.';
  if (/email rate limit|over_email_send_rate_limit/i.test(msg))
    return 'Trop de tentatives. Réessayez dans quelques minutes.';
  return 'Une erreur est survenue. Réessayez.';
}
