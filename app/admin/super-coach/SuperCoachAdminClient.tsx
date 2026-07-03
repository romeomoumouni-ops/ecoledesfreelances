'use client';

// Cerveau du Super Coach : les admins collent ici les transcripts de cours,
// méthodes et conseils de Roméo. L'IA pioche automatiquement dedans (recherche
// plein texte en français) pour répondre aux élèves.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IconPlus, IconX, IconSparkle } from '@/components/Icons';
import type { Knowledge } from './page';

const supabase = createClient();

export default function SuperCoachAdminClient({ items }: { items: Knowledge[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function add() {
    if (!title.trim() || !content.trim()) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase
      .from('coach_knowledge')
      .insert({ title: title.trim(), content: content.trim() });
    setBusy(false);
    if (error) return setErr(error.message);
    setTitle('');
    setContent('');
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce contenu du cerveau du Super Coach ?')) return;
    const { error } = await supabase.from('coach_knowledge').delete().eq('id', id);
    if (error) return setErr(error.message);
    router.refresh();
  }

  return (
    <>
      <h1 className="mb-1 flex items-center gap-2 text-xl font-bold text-ink">
        <IconSparkle width={20} height={20} /> Super Coach — cerveau
      </h1>
      <p className="mb-4 text-sm text-muted">
        Collez ici les connaissances de Roméo : transcripts de cours, méthodes, conseils, réponses types.
        L&apos;IA pioche automatiquement dans ces contenus pour répondre aux élèves. Le catalogue des cours
        (titres, modules, chapitres) est déjà connu de l&apos;IA sans rien ajouter.
      </p>

      {err && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Liste */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-ink">Contenus ({items.length})</h2>
          {items.length ? (
            <div className="card divide-y divide-line overflow-hidden">
              {items.map((k) => (
                <div key={k.id}>
                  <div className="flex items-center gap-3 p-4">
                    <button
                      onClick={() => setOpen(open === k.id ? null : k.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-semibold text-ink">{k.title}</p>
                      <p className="text-xs text-muted">
                        {k.content.length.toLocaleString('fr-FR')} caractères ·{' '}
                        {new Date(k.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </button>
                    <button
                      onClick={() => remove(k.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
                      aria-label="Supprimer"
                    >
                      <IconX width={16} height={16} />
                    </button>
                  </div>
                  {open === k.id && (
                    <p className="max-h-64 overflow-y-auto whitespace-pre-line border-t border-line bg-black/[0.02] px-4 py-3 text-xs leading-relaxed text-muted">
                      {k.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-sm text-muted">
              Aucun contenu pour l&apos;instant. Ajoutez le premier avec le formulaire →
            </div>
          )}
        </div>

        {/* Formulaire */}
        <div>
          <div className="card p-5 lg:sticky lg:top-[150px]">
            <h2 className="font-bold text-ink">Ajouter un contenu</h2>
            <p className="mb-4 mt-1 text-xs text-muted">
              Un sujet par contenu (ex. « Méthode de prospection », « Transcript — Mindset chapitre 1 »).
            </p>
            <div className="space-y-3">
              <input
                className="input"
                placeholder="Titre du contenu"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="input min-h-[220px]"
                placeholder="Collez ici le transcript, la méthode, les conseils…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <button
                onClick={add}
                disabled={busy || !title.trim() || !content.trim()}
                className="btn-primary w-full disabled:opacity-60"
              >
                <IconPlus width={17} height={17} /> {busy ? 'Ajout…' : 'Ajouter au cerveau'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
