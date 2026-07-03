'use client';

// Cerveau du Super Coach (mode gratuit, sans coût par message) :
// - FAQ : paires question -> réponse exacte de Roméo (servies telles quelles)
// - Contenus : transcripts/méthodes où l'IA pioche des extraits pertinents
// Recherche plein texte française côté Postgres — aucun appel payant.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IconPlus, IconX, IconSparkle } from '@/components/Icons';
import type { Knowledge, Faq } from './page';

const supabase = createClient();

export default function SuperCoachAdminClient({ items, faq }: { items: Knowledge[]; faq: Faq[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<'faq' | 'contenus'>('faq');
  const [err, setErr] = useState<string | null>(null);

  return (
    <>
      <h1 className="mb-1 flex items-center gap-2 text-xl font-bold text-ink">
        <IconSparkle width={20} height={20} /> Super Coach — cerveau
      </h1>
      <p className="mb-4 text-sm text-muted">
        Le Super Coach répond gratuitement à partir de ce que vous mettez ici. Les{' '}
        <b className="text-ink">Questions/Réponses</b> sont servies telles quelles quand un élève pose une
        question proche ; les <b className="text-ink">Contenus</b> (transcripts, méthodes) fournissent des
        extraits. Question trop complexe → l&apos;IA redirige vers le suivi ou les coachs.
      </p>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('faq')}
          className={`chip px-4 py-2.5 text-sm transition ${
            tab === 'faq' ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'
          }`}
        >
          Questions/Réponses ({faq.length})
        </button>
        <button
          onClick={() => setTab('contenus')}
          className={`chip px-4 py-2.5 text-sm transition ${
            tab === 'contenus' ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'
          }`}
        >
          Contenus ({items.length})
        </button>
      </div>

      {err && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      {tab === 'faq' ? (
        <FaqTab faq={faq} onError={setErr} onChange={() => router.refresh()} />
      ) : (
        <ContenusTab items={items} onError={setErr} onChange={() => router.refresh()} />
      )}
    </>
  );
}

/* ---------- Onglet FAQ ---------- */
function FaqTab({
  faq,
  onError,
  onChange,
}: {
  faq: Faq[];
  onError: (m: string | null) => void;
  onChange: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  async function add() {
    if (!question.trim() || !answer.trim()) return;
    setBusy(true);
    onError(null);
    const { error } = await supabase
      .from('coach_faq')
      .insert({ question: question.trim(), answer: answer.trim() });
    setBusy(false);
    if (error) return onError(error.message);
    setQuestion('');
    setAnswer('');
    onChange();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette question/réponse ?')) return;
    const { error } = await supabase.from('coach_faq').delete().eq('id', id);
    if (error) return onError(error.message);
    onChange();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div>
        {faq.length ? (
          <div className="card divide-y divide-line overflow-hidden">
            {faq.map((f) => (
              <div key={f.id}>
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => setOpen(open === f.id ? null : f.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold text-ink">{f.question}</p>
                    <p className="truncate text-xs text-muted">{f.answer}</p>
                  </button>
                  <button
                    onClick={() => remove(f.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
                    aria-label="Supprimer"
                  >
                    <IconX width={16} height={16} />
                  </button>
                </div>
                {open === f.id && (
                  <p className="whitespace-pre-line border-t border-line bg-black/[0.02] px-4 py-3 text-xs leading-relaxed text-muted">
                    {f.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-muted">Aucune question/réponse pour l&apos;instant.</div>
        )}
      </div>

      <div>
        <div className="card p-5 lg:sticky lg:top-[150px]">
          <h2 className="font-bold text-ink">Ajouter une Q/R</h2>
          <p className="mb-4 mt-1 text-xs text-muted">
            Mets plusieurs formulations dans la question (ex. « Comment payer ? Où régler mon échéance ? ») pour
            que l&apos;IA la retrouve facilement. La réponse peut contenir du gras (**texte**) et des liens.
          </p>
          <div className="space-y-3">
            <textarea
              className="input min-h-[70px]"
              placeholder="Question(s) type des élèves"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <textarea
              className="input min-h-[140px]"
              placeholder="La réponse de Roméo, servie telle quelle"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <button
              onClick={add}
              disabled={busy || !question.trim() || !answer.trim()}
              className="btn-primary w-full disabled:opacity-60"
            >
              <IconPlus width={17} height={17} /> {busy ? 'Ajout…' : 'Ajouter la Q/R'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Onglet Contenus ---------- */
function ContenusTab({
  items,
  onError,
  onChange,
}: {
  items: Knowledge[];
  onError: (m: string | null) => void;
  onChange: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  async function add() {
    if (!title.trim() || !content.trim()) return;
    setBusy(true);
    onError(null);
    const { error } = await supabase
      .from('coach_knowledge')
      .insert({ title: title.trim(), content: content.trim() });
    setBusy(false);
    if (error) return onError(error.message);
    setTitle('');
    setContent('');
    onChange();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce contenu du cerveau du Super Coach ?')) return;
    const { error } = await supabase.from('coach_knowledge').delete().eq('id', id);
    if (error) return onError(error.message);
    onChange();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div>
        {items.length ? (
          <div className="card divide-y divide-line overflow-hidden">
            {items.map((k) => (
              <div key={k.id}>
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => setOpen(open === k.id ? null : k.id)} className="min-w-0 flex-1 text-left">
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
          <div className="card p-8 text-center text-sm text-muted">Aucun contenu pour l&apos;instant.</div>
        )}
      </div>

      <div>
        <div className="card p-5 lg:sticky lg:top-[150px]">
          <h2 className="font-bold text-ink">Ajouter un contenu</h2>
          <p className="mb-4 mt-1 text-xs text-muted">
            Un sujet par contenu (ex. « Méthode de prospection », « Transcript — Mindset chapitre 1 »).
            L&apos;IA en sert des extraits quand la question s&apos;y rapporte.
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
  );
}
