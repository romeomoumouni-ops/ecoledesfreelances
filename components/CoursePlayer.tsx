'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Curriculum, Chapter } from '@/lib/content';
import Avatar from '@/components/Avatar';
import { EmptyState } from '@/components/UI';
import {
  IconPlayFill,
  IconCheck,
  IconChevronRight,
  IconBook,
  IconCheckCircle,
} from '@/components/Icons';

const supabase = createClient();

type Me = { id: string; name: string };

export default function CoursePlayer({
  course,
  tree,
  me,
}: {
  course: { id: string; title: string };
  tree: Curriculum[];
  me: Me;
}) {
  const allChapters = useMemo(() => tree.flatMap((c) => c.chapters), [tree]);
  const [currentId, setCurrentId] = useState<string | null>(allChapters[0]?.id ?? null);
  const current = allChapters.find((c) => c.id === currentId) ?? null;

  if (allChapters.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link href={`/catalogue/${course.id}`} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
          <IconChevronRight width={16} height={16} className="rotate-180" /> Retour
        </Link>
        <EmptyState
          Icon={IconBook}
          title="Ce cours n'a pas encore de contenu"
          text="Le formateur n'a pas encore ajouté de chapitres. Revenez bientôt !"
        />
      </div>
    );
  }

  return (
    <div>
      <Link href="/mes-formations" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <IconChevronRight width={16} height={16} className="rotate-180" /> Mes cours
      </Link>
      <h1 className="mb-4 text-xl font-bold text-ink">{course.title}</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Lecteur */}
        <div className="space-y-6">
          {current ? (
            <>
              <div className="card overflow-hidden">
                {current.video_url ? (
                  <video key={current.id} src={current.video_url} controls className="aspect-video w-full bg-ink" />
                ) : (
                  <div className="grid aspect-video place-items-center bg-ink text-white/60">
                    <span className="flex items-center gap-2 text-sm">
                      <IconPlayFill width={16} height={16} /> Vidéo bientôt disponible
                    </span>
                  </div>
                )}
                <div className="p-5">
                  <h2 className="text-lg font-bold text-ink">{current.title}</h2>
                  {current.description && (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{current.description}</p>
                  )}
                </div>
              </div>

              {current.quiz.length > 0 && <Quiz chapter={current} />}
              <Comments chapterId={current.id} me={me} />
            </>
          ) : (
            <p className="text-sm text-muted">Sélectionnez un chapitre.</p>
          )}
        </div>

        {/* Curriculum */}
        <aside>
          <div className="card overflow-hidden lg:sticky lg:top-[88px]">
            <div className="border-b border-line p-4">
              <p className="font-bold text-ink">Contenu du cours</p>
              <p className="text-xs text-muted">{allChapters.length} chapitre(s)</p>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {tree.map((cur) => (
                <div key={cur.id}>
                  <div className="flex items-center gap-2 bg-surface px-4 py-2.5">
                    {cur.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cur.thumbnail_url} alt="" className="h-6 w-9 rounded object-cover" />
                    ) : null}
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">{cur.title}</p>
                  </div>
                  {cur.chapters.map((ch) => {
                    const on = ch.id === currentId;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => setCurrentId(ch.id)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${on ? 'bg-black/[0.04]' : 'hover:bg-black/[0.02]'}`}
                      >
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${on ? 'bg-ink text-white' : 'bg-black/[0.05] text-muted'}`}>
                          <IconPlayFill width={11} height={11} />
                        </span>
                        <span className={`flex-1 text-sm ${on ? 'font-semibold text-ink' : 'text-ink'}`}>{ch.title}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Quiz interactif ---------- */
function Quiz({ chapter }: { chapter: Chapter }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);
  const score = chapter.quiz.filter((q) => answers[q.id] === q.correct_index).length;

  return (
    <div className="card p-5">
      <h3 className="mb-4 flex items-center gap-2 font-bold text-ink">
        <IconCheckCircle width={18} height={18} /> Quiz
      </h3>
      <div className="space-y-5">
        {chapter.quiz.map((q, qi) => (
          <div key={q.id}>
            <p className="text-sm font-semibold text-ink">
              {qi + 1}. {q.question}
            </p>
            <div className="mt-2 space-y-1.5">
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === oi;
                const isCorrect = oi === q.correct_index;
                const show = checked && (selected || isCorrect);
                return (
                  <label
                    key={oi}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
                      show && isCorrect
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : show && selected && !isCorrect
                        ? 'border-red-400 bg-red-50 text-red-600'
                        : selected
                        ? 'border-ink bg-black/[0.03] text-ink'
                        : 'border-line text-ink hover:bg-black/[0.02]'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={selected}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      className="h-4 w-4 accent-ink"
                      disabled={checked}
                    />
                    <span className="flex-1">{opt}</span>
                    {show && isCorrect && <IconCheck width={15} height={15} />}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        {!checked ? (
          <button onClick={() => setChecked(true)} className="btn-primary">
            Valider mes réponses
          </button>
        ) : (
          <>
            <span className="text-sm font-semibold text-ink">
              Score : {score} / {chapter.quiz.length}
            </span>
            <button
              onClick={() => {
                setChecked(false);
                setAnswers({});
              }}
              className="btn-outline"
            >
              Recommencer
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Commentaires ---------- */
type Comment = { id: string; author_name: string | null; body: string; created_at: string };

function Comments({ chapterId, me }: { chapterId: string; me: Me }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from('chapter_comments')
      .select('id, author_name, body, created_at')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) {
          setComments(data ?? []);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [chapterId]);

  async function post() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const { data, error } = await supabase
      .from('chapter_comments')
      .insert({ chapter_id: chapterId, user_id: me.id, author_name: me.name, body: text })
      .select('id, author_name, body, created_at')
      .single();
    if (!error && data) {
      setComments((c) => [data, ...c]);
      setBody('');
    }
    setBusy(false);
  }

  function initials(name: string | null) {
    return (name || 'M').split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  }

  return (
    <div className="card p-5">
      <h3 className="mb-4 font-bold text-ink">Commentaires</h3>
      <div className="flex items-start gap-3">
        <Avatar initials={initials(me.name)} size={36} />
        <div className="flex-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="input min-h-[64px] resize-none"
            placeholder="Posez une question ou partagez un retour…"
          />
          <div className="mt-2 flex justify-end">
            <button onClick={post} disabled={busy || !body.trim()} className="btn-primary disabled:opacity-60">
              {busy ? 'Envoi…' : 'Commenter'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {loading ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : comments.length ? (
          comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3">
              <Avatar initials={initials(c.author_name)} size={36} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">{c.author_name || 'Membre'}</p>
                <p className="text-sm leading-relaxed text-ink">{c.body}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">Aucun commentaire pour l'instant. Lancez la discussion !</p>
        )}
      </div>
    </div>
  );
}
