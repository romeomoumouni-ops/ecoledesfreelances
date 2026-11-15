'use client';

// Mini questionnaire à la première connexion des nouveaux élèves : deux
// questions, obligatoires, puis « Continuer vers le programme ». Ne revient
// jamais une fois rempli.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SITUATIONS } from '@/lib/onboarding';

const supabase = createClient();

export default function OnboardingModal({ userId, firstName, preview = false }: { userId: string; firstName: string; preview?: boolean }) {
  const router = useRouter();
  const [motivation, setMotivation] = useState('');
  const [situation, setSituation] = useState('');
  const [autre, setAutre] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const ok = motivation.trim().length >= 3 && !!situation && (situation !== 'autre' || autre.trim().length >= 2) && !busy;

  async function submit() {
    if (!ok) return;
    setBusy(true);
    setErr('');
    if (preview) {
      // Aperçu admin : rien n'est enregistré, retour à l'onglet Profils entrants
      router.push('/admin/profils');
      return;
    }
    const { error } = await supabase.from('onboarding_answers').insert({
      user_id: userId,
      motivation: motivation.trim(),
      situation,
      situation_autre: situation === 'autre' ? autre.trim() : null,
    });
    if (error && error.code !== '23505') {
      setErr('Petit souci, réessaie dans un instant.');
      setBusy(false);
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-ink px-6 py-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/60">Bienvenue {firstName} 👋</p>
          <h2 className="mt-1 text-xl font-bold">Deux petites questions avant de commencer</h2>
          <p className="mt-1 text-sm text-white/70">30 secondes, pour mieux t&apos;accompagner.</p>
        </div>
        <div className="p-6">
          <label className="block text-sm font-semibold text-ink">
            Quelle est la raison principale qui t&apos;a poussé(e) à rejoindre l&apos;incubateur ?
          </label>
          <textarea
            autoFocus
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder="Dis-le avec tes mots…"
            className="input mt-2 w-full resize-none text-[16px] sm:text-sm"
          />

          <p className="mt-4 text-sm font-semibold text-ink">Quelle est ta situation actuelle ?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {SITUATIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSituation(s.key)}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                  situation === s.key ? 'border-ink bg-ink text-white' : 'border-black/15 bg-white text-ink hover:border-black/40'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {situation === 'autre' && (
            <input
              value={autre}
              onChange={(e) => setAutre(e.target.value)}
              maxLength={120}
              placeholder="Précise ta situation"
              className="input mt-2 w-full text-[16px] sm:text-sm"
            />
          )}

          {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{err}</p>}

          <button
            onClick={submit}
            disabled={!ok}
            className="mt-5 w-full rounded-xl bg-ink py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Enregistrement…' : 'Continuer vers le programme →'}
          </button>
        </div>
      </div>
    </div>
  );
}
