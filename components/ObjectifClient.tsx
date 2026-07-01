'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/UI';
import { OBJECTIVE_TASKS, OBJECTIVE_TARGET, scoreFromKeys } from '@/lib/tasks';
import { IconCheck, IconShield } from '@/components/Icons';

const supabase = createClient();

export default function ObjectifClient({
  userId,
  initialKeys,
}: {
  userId: string;
  initialKeys: string[];
}) {
  const router = useRouter();
  const [done, setDone] = useState<Set<string>>(new Set(initialKeys));
  const [busy, setBusy] = useState<string | null>(null);

  const score = scoreFromKeys(done);
  const percent = Math.min(100, Math.round((score / OBJECTIVE_TARGET) * 100));

  async function toggle(key: string) {
    if (busy) return;
    const isDone = done.has(key);
    setBusy(key);
    // Mise à jour optimiste
    const next = new Set(done);
    if (isDone) next.delete(key);
    else next.add(key);
    setDone(next);

    try {
      if (isDone) {
        const { error } = await supabase
          .from('task_completions')
          .delete()
          .eq('user_id', userId)
          .eq('task_key', key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('task_completions')
          .insert({ user_id: userId, task_key: key });
        if (error) throw error;
      }
      router.refresh(); // met à jour le tableau de bord
    } catch {
      // rollback si échec
      const rb = new Set(next);
      if (isDone) rb.add(key);
      else rb.delete(key);
      setDone(rb);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Objectif"
        subtitle="Accomplis ces tâches pour atteindre ton objectif. Chaque tâche cochée te rapproche du but."
      />

      {/* Score */}
      <div className="card mb-5 p-5 sm:p-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted">Ta progression</p>
            <p className="text-3xl font-bold tracking-tight text-ink">
              {score % 1 === 0 ? score : score.toFixed(1)}
              <span className="text-lg font-semibold text-muted"> / {OBJECTIVE_TARGET} pts</span>
            </p>
          </div>
          <span className="text-2xl font-bold text-ink">{percent}%</span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-black/[0.07]">
          <div className="h-full rounded-full bg-ink transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* Honnêteté */}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-line bg-black/[0.02] p-4">
        <span className="mt-0.5 shrink-0 text-ink">
          <IconShield width={20} height={20} />
        </span>
        <p className="text-sm leading-relaxed text-ink">
          <b>Sois 100 % honnête.</b> Ne coche une tâche que si tu l&apos;as réellement accomplie.
          C&apos;est la seule façon d&apos;avancer vraiment vers ton objectif.
        </p>
      </div>

      {/* Liste des tâches */}
      <div className="card divide-y divide-line overflow-hidden">
        {OBJECTIVE_TASKS.map((t) => {
          const checked = done.has(t.key);
          return (
            <button
              key={t.key}
              onClick={() => toggle(t.key)}
              disabled={busy === t.key}
              className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-black/[0.02] disabled:opacity-60"
            >
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition ${
                  checked ? 'border-ink bg-ink text-white' : 'border-[#d0d0ce] bg-white text-transparent'
                }`}
              >
                <IconCheck width={14} height={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{t.label}</span>
                {t.note && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{t.note}</span>}
              </span>
              <span className="shrink-0 text-sm font-bold text-ink">
                +{t.points % 1 === 0 ? t.points : t.points.toFixed(1)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        Accomplis tes tâches pour augmenter tes points. Sois honnête. 💪
      </p>
    </>
  );
}
