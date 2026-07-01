'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IconArrowRight } from '@/components/Icons';

export default function AuthForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<false | 'login' | 'signup'>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function validate() {
    if (!email || !password) {
      setError('Renseignez votre e-mail et votre mot de passe.');
      return false;
    }
    return true;
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
      router.replace('/tableau-de-bord');
      router.refresh();
    } catch (err) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    setError(null);
    setMessage(null);
    if (!validate()) return;
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading('signup');
    try {
      // Garde-fou : e-mail autorisé ? (permissif pour l'instant, cf. is_email_allowed)
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
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
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
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (/Unable to validate email address|email_address_invalid/i.test(msg))
    return 'Adresse e-mail invalide.';
  if (/Email not confirmed/i.test(msg))
    return 'Veuillez confirmer votre e-mail (lien reçu par mail) avant de vous connecter.';
  if (/email rate limit|over_email_send_rate_limit/i.test(msg))
    return 'Trop de tentatives. Réessayez dans quelques minutes.';
  return 'Une erreur est survenue. Réessayez.';
}
