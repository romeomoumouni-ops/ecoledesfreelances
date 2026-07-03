'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { QuizQuestion } from '@/lib/content';
import Avatar from '@/components/Avatar';
import RichText from '@/components/RichText';
import { EmptyState } from '@/components/UI';
import { IconPlayFill, IconCheck, IconChevronRight, IconBook, IconCheckCircle, IconX } from '@/components/Icons';

const supabase = createClient();

type Me = { id: string; name: string; isAdmin?: boolean };
type PlayerModule = { id: string; title: string };
type PlayerChapter = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  moduleId: string | null;
  startAt: number;
  quiz: QuizQuestion[];
};

export default function CoursePlayer({
  course,
  chapters,
  modules = [],
  me,
}: {
  course: { id: string; title: string };
  chapters: PlayerChapter[];
  modules?: PlayerModule[];
  me: Me;
}) {
  // Regroupe les chapitres par module (dans l'ordre des modules), puis les non classés.
  const grouped = modules.map((m) => ({ module: m, items: chapters.filter((c) => c.moduleId === m.id) }));
  const ungrouped = chapters.filter((c) => !c.moduleId || !modules.some((m) => m.id === c.moduleId));
  const ordered = [...grouped.flatMap((g) => g.items), ...ungrouped];
  const numberById = new Map(ordered.map((c, i) => [c.id, i + 1]));
  const useModules = modules.length > 0;

  const [currentId, setCurrentId] = useState<string | null>(ordered[0]?.id ?? chapters[0]?.id ?? null);
  const current = chapters.find((c) => c.id === currentId) ?? null;

  const idx = ordered.findIndex((c) => c.id === currentId);
  const prevChapter = idx > 0 ? ordered[idx - 1] : null;
  const nextChapter = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
  function goTo(id: string) {
    setCurrentId(id);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (chapters.length === 0) {
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
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href="/mes-formations" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
          <IconChevronRight width={16} height={16} className="rotate-180" /> Mes cours
        </Link>
        <div className="flex items-center gap-2">
          {prevChapter && (
            <button
              onClick={() => goTo(prevChapter.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-muted transition hover:bg-black/[0.03] hover:text-ink"
              title={`Précédent : ${prevChapter.title}`}
            >
              <IconChevronRight width={15} height={15} className="rotate-180" />
              <span className="hidden sm:inline">Précédent</span>
            </button>
          )}
          {nextChapter && (
            <button
              onClick={() => goTo(nextChapter.id)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-black"
              title={`Suivant : ${nextChapter.title}`}
            >
              Suivant
              <IconChevronRight width={15} height={15} />
            </button>
          )}
        </div>
      </div>
      <h1 className="mb-4 text-xl font-bold text-ink">{course.title}</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Lecteur */}
        <div className="space-y-6">
          {current && (
            <>
              <div className="card overflow-hidden">
                {current.videoUrl ? (
                  <VideoPlayer
                    key={current.id}
                    chapterId={current.id}
                    src={current.videoUrl}
                    startAt={current.startAt}
                    userId={me.id}
                  />
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
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
                      <RichText text={current.description} />
                    </p>
                  )}
                </div>
              </div>

              {current.quiz.length > 0 && <Quiz chapter={current} />}
              <Comments chapterId={current.id} me={me} />
            </>
          )}
        </div>

        {/* Sommaire des chapitres */}
        <aside>
          <div className="card overflow-hidden lg:sticky lg:top-[88px]">
            <div className="border-b border-line p-4">
              <p className="font-bold text-ink">Contenu du cours</p>
              <p className="text-xs text-muted">
                {useModules ? `${modules.length} module(s) · ` : ''}{chapters.length} chapitre(s)
              </p>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {useModules ? (
                <>
                  {grouped.map((g, gi) => (
                    <div key={g.module.id}>
                      <div className="sticky top-0 z-[1] border-t border-line bg-[#f2f2f0] px-4 py-2 first:border-t-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                          Module {gi + 1}
                        </p>
                        <p className="text-sm font-bold text-ink">{g.module.title}</p>
                      </div>
                      {g.items.length ? (
                        g.items.map((ch) => (
                          <ChapterRow key={ch.id} ch={ch} n={numberById.get(ch.id)!} on={ch.id === currentId} onClick={() => setCurrentId(ch.id)} />
                        ))
                      ) : (
                        <p className="px-4 py-2 text-xs text-muted">À venir…</p>
                      )}
                    </div>
                  ))}
                  {ungrouped.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-[1] border-t border-line bg-[#f2f2f0] px-4 py-2">
                        <p className="text-sm font-bold text-ink">Autres chapitres</p>
                      </div>
                      {ungrouped.map((ch) => (
                        <ChapterRow key={ch.id} ch={ch} n={numberById.get(ch.id)!} on={ch.id === currentId} onClick={() => setCurrentId(ch.id)} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                chapters.map((ch, i) => (
                  <ChapterRow key={ch.id} ch={ch} n={i + 1} on={ch.id === currentId} onClick={() => setCurrentId(ch.id)} />
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Ligne de chapitre (sommaire) ---------- */
function ChapterRow({
  ch,
  n,
  on,
  onClick,
}: {
  ch: PlayerChapter;
  n: number;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-t border-line px-4 py-3 text-left transition first:border-t-0 ${on ? 'bg-black/[0.04]' : 'hover:bg-black/[0.02]'}`}
    >
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${on ? 'bg-ink text-white' : 'bg-black/[0.05] text-muted'}`}>
        {n}
      </span>
      <span className={`flex-1 text-sm ${on ? 'font-semibold text-ink' : 'text-ink'}`}>{ch.title}</span>
      {ch.videoUrl && <IconPlayFill width={12} height={12} className="text-muted" />}
    </button>
  );
}

/* ---------- Lecteur vidéo (reprise + sauvegarde + anti-téléchargement) ---------- */
function VideoPlayer({
  chapterId,
  src,
  startAt,
  userId,
}: {
  chapterId: string;
  src: string;
  startAt: number;
  userId: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const lastSave = useRef(0);

  async function save(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    await supabase
      .from('video_progress')
      .upsert(
        { user_id: userId, chapter_id: chapterId, seconds, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,chapter_id' }
      );
  }

  function onLoadedMetadata() {
    const v = ref.current;
    if (v && startAt > 3 && startAt < (v.duration || Infinity) - 2) {
      v.currentTime = startAt;
    }
  }

  function onTimeUpdate() {
    const v = ref.current;
    if (!v) return;
    const now = Date.now();
    if (now - lastSave.current > 5000) {
      lastSave.current = now;
      void save(v.currentTime);
    }
  }

  // Sauvegarde en quittant le chapitre / la page
  useEffect(() => {
    const el = ref.current;
    return () => {
      if (el) void save(el.currentTime);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  return (
    <video
      ref={ref}
      src={src}
      controls
      controlsList="nodownload noplaybackrate noremoteplayback"
      disablePictureInPicture
      onContextMenu={(e) => e.preventDefault()}
      onLoadedMetadata={onLoadedMetadata}
      onTimeUpdate={onTimeUpdate}
      onPause={() => ref.current && void save(ref.current.currentTime)}
      className="aspect-video w-full bg-ink"
    />
  );
}

/* ---------- Quiz interactif (correction côté serveur) ---------- */
type QuizResult = { id: string; correct: boolean; correct_index: number };

function Quiz({ chapter }: { chapter: PlayerChapter }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Map<string, QuizResult> | null>(null);
  const [busy, setBusy] = useState(false);

  const allAnswered = chapter.quiz.every((q) => answers[q.id] !== undefined);
  const score = results ? [...results.values()].filter((r) => r.correct).length : 0;

  async function check() {
    setBusy(true);
    const { data, error } = await supabase.rpc('check_quiz', {
      p_chapter_id: chapter.id,
      p_answers: answers,
    });
    setBusy(false);
    if (error || !Array.isArray(data)) return;
    setResults(new Map((data as QuizResult[]).map((r) => [r.id, r])));
  }

  return (
    <div className="card p-5">
      <h3 className="mb-4 flex items-center gap-2 font-bold text-ink">
        <IconCheckCircle width={18} height={18} /> Quiz
      </h3>
      <div className="space-y-5">
        {chapter.quiz.map((q, qi) => {
          const res = results?.get(q.id);
          return (
            <div key={q.id}>
              <p className="text-sm font-semibold text-ink">
                {qi + 1}. {q.question}
              </p>
              <div className="mt-2 space-y-1.5">
                {q.options.map((opt, oi) => {
                  const selected = answers[q.id] === oi;
                  const isCorrect = res ? oi === res.correct_index : false;
                  const show = !!res && (selected || isCorrect);
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
                        disabled={!!results}
                      />
                      <span className="flex-1">{opt}</span>
                      {show && isCorrect && <IconCheck width={15} height={15} />}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-3">
        {!results ? (
          <button onClick={check} disabled={busy || !allAnswered} className="btn-primary disabled:opacity-60">
            {busy ? 'Correction…' : 'Valider mes réponses'}
          </button>
        ) : (
          <>
            <span className="text-sm font-semibold text-ink">
              Score : {score} / {chapter.quiz.length}
            </span>
            <button
              onClick={() => {
                setResults(null);
                setAnswers({});
              }}
              className="btn-outline"
            >
              Recommencer
            </button>
          </>
        )}
        {!results && !allAnswered && (
          <span className="text-xs text-muted">Réponds à toutes les questions pour valider.</span>
        )}
      </div>
    </div>
  );
}

/* ---------- Commentaires ---------- */
type Comment = { id: string; author_name: string | null; body: string; user_id: string; created_at: string };

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
      .select('id, author_name, body, user_id, created_at')
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
      .select('id, author_name, body, user_id, created_at')
      .single();
    if (!error && data) {
      setComments((c) => [data, ...c]);
      setBody('');
    }
    setBusy(false);
  }

  async function del(id: string) {
    setComments((c) => c.filter((x) => x.id !== id));
    await supabase.from('chapter_comments').delete().eq('id', id);
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
            placeholder="Dis nous ce que tu as retenu de ce chapitre"
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
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
                  <RichText text={c.body} />
                </p>
              </div>
              {(c.user_id === me.id || me.isAdmin) && (
                <button
                  onClick={() => del(c.id)}
                  className="mt-1 text-muted hover:text-red-600"
                  aria-label="Supprimer"
                >
                  <IconX width={15} height={15} />
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">Aucun commentaire pour l&apos;instant. Lancez la discussion !</p>
        )}
      </div>
    </div>
  );
}
