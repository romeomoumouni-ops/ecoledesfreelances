'use client';

import { useState } from 'react';
import { testLiveNotification } from '@/lib/admin-actions';

/**
 * Bouton « Mode test » : déclenche la notification de live à l'admin seul
 * (e-mail + message Mariane) et affiche le résultat, sans notifier les étudiants.
 */
export default function LiveTestButton() {
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setInfo(null);
    try {
      const r = await testLiveNotification();
      setInfo(r.info);
    } catch (e) {
      setInfo(e instanceof Error ? e.message : 'Erreur pendant le test.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <button type="button" onClick={run} disabled={busy} className="btn-outline w-full disabled:opacity-60">
        {busy ? 'Envoi du test…' : "Tester la notif (m'envoyer à moi seul)"}
      </button>
      <p className="mt-1.5 text-center text-[11px] leading-relaxed text-muted">
        N&apos;envoie rien aux étudiants — juste à ton compte, pour vérifier.
      </p>
      {info && (
        <p className="mt-2 whitespace-pre-line rounded-lg bg-black/[0.04] px-3 py-2 text-xs leading-relaxed text-ink">
          {info}
        </p>
      )}
    </div>
  );
}
