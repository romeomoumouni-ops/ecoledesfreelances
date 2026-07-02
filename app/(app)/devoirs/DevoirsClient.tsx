'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Badge, EmptyState } from '@/components/UI';
import type { Assignment } from '@/lib/db';
import { IconClipboard, IconClock, IconCheck } from '@/components/Icons';

const supabase = createClient();

export default function DevoirsClient({
  userId,
  assignments,
  submittedIds,
}: {
  userId: string;
  assignments: Assignment[];
  submittedIds: string[];
}) {
  const router = useRouter();
  const [done, setDone] = useState<Set<string>>(new Set(submittedIds));
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(id: string) {
    if (busy) return;
    const isDone = done.has(id);
    setBusy(id);
    const next = new Set(done);
    if (isDone) next.delete(id);
    else next.add(id);
    setDone(next);
    try {
      if (isDone) {
        const { error } = await supabase
          .from('assignment_submissions')
          .delete()
          .eq('user_id', userId)
          .eq('assignment_id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('assignment_submissions')
          .insert({ user_id: userId, assignment_id: id });
        if (error) throw error;
      }
      router.refresh();
    } catch {
      setDone(done); // rollback
    } finally {
      setBusy(null);
    }
  }

  const toDo = assignments.filter((a) => !done.has(a.id));
  const finished = assignments.filter((a) => done.has(a.id));

  return (
    <>
      <PageHeader
        title="Devoirs"
        subtitle="Mets en pratique ce que tu apprends, puis marque tes exercices comme rendus."
      />

      {assignments.length === 0 ? (
        <EmptyState
          Icon={IconClipboard}
          title="Aucun devoir pour le moment"
          text="Les exercices donnés par vos formateurs apparaîtront ici."
        />
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-lg font-bold text-ink">À rendre ({toDo.length})</h2>
            {toDo.length ? (
              <div className="space-y-3">
                {toDo.map((a) => (
                  <Row key={a.id} a={a} done={false} busy={busy === a.id} onToggle={() => toggle(a.id)} />
                ))}
              </div>
            ) : (
              <p className="card p-5 text-center text-sm text-muted">Tout est rendu, bravo ! 🎉</p>
            )}
          </section>

          {finished.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-ink">Rendus ({finished.length})</h2>
              <div className="space-y-3">
                {finished.map((a) => (
                  <Row key={a.id} a={a} done busy={busy === a.id} onToggle={() => toggle(a.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function Row({
  a,
  done,
  busy,
  onToggle,
}: {
  a: Assignment;
  done: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${
          done ? 'bg-black/[0.06] text-ink' : 'bg-black/[0.04] text-ink'
        }`}
      >
        {done ? <IconCheck width={20} height={20} /> : <IconClipboard width={20} height={20} />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-ink">{a.title}</h3>
          {done ? <Badge>Rendu</Badge> : <Badge variant="outline">À rendre</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {a.course && `${a.course} · `}
          {a.due && (
            <span className="inline-flex items-center gap-1">
              <IconClock width={13} height={13} /> {a.due}
            </span>
          )}
          {a.points ? ` · ${a.points} pts` : ''}
        </p>
      </div>

      <button
        onClick={onToggle}
        disabled={busy}
        className={`${done ? 'btn-outline' : 'btn-primary'} shrink-0 disabled:opacity-60`}
      >
        {busy ? '…' : done ? 'Annuler le rendu' : 'Marquer comme rendu'}
      </button>
    </div>
  );
}
