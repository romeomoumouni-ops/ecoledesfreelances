'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as tus from 'tus-js-client';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createClient } from '@/lib/supabase/client';
import type { Chapter } from '@/lib/content';
import RichTextArea from '@/components/RichTextArea';
import { IconPlus, IconX, IconPlayFill, IconPen, IconGrip } from '@/components/Icons';

const supabase = createClient();
const BUCKET = 'course-media';

/**
 * Upload résumable (TUS) : découpe le fichier en morceaux de 6 Mo, reprend en
 * cas de coupure, et remonte la progression. Adapté aux grosses vidéos.
 */
async function uploadVideoResumable(
  courseId: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Session expirée, reconnectez-vous.');

  const ext = file.name.split('.').pop() || 'mp4';
  const objectName = `videos/${courseId}/${crypto.randomUUID()}.${ext}`;

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${token}`,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024, // Supabase impose des morceaux de 6 Mo
      metadata: {
        bucketName: BUCKET,
        objectName,
        contentType: file.type || 'video/mp4',
        cacheControl: '3600',
      },
      onError: (e) => reject(e),
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onSuccess: () => resolve(),
    });
    upload.findPreviousUploads().then((prev) => {
      if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    });
  });

  // On stocke le CHEMIN (bucket privé) ; l'URL est signée à la lecture.
  return objectName;
}

export default function CourseBuilder({
  course,
  chapters,
}: {
  course: { id: string; title: string };
  chapters: Chapter[];
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<Chapter[]>(chapters);

  // Resynchronise quand les données serveur changent (ajout/suppression/édition)
  useEffect(() => {
    setItems(chapters);
  }, [chapters]);

  function fail(e: unknown) {
    setErr(e instanceof Error ? e.message : 'Une erreur est survenue.');
    setTimeout(() => setErr(null), 5000);
  }
  const refresh = () => router.refresh();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((c) => c.id === active.id);
    const newIndex = items.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered); // mise à jour optimiste immédiate

    try {
      // Persiste le nouvel ordre (position = index)
      await Promise.all(
        reordered.map((c, i) =>
          supabase.from('chapters').update({ position: i }).eq('id', c.id)
        )
      );
    } catch (e) {
      fail(e);
      setItems(chapters); // rollback
    }
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-ink">Chapitres</h2>
      <p className="mt-1 text-sm text-muted">
        Glissez un chapitre par la poignée pour le réordonner. Chaque chapitre a une vidéo et, si vous voulez, un quiz.
      </p>

      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      {items.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-4 space-y-2">
              {items.map((ch, i) => (
                <SortableChapter
                  key={ch.id}
                  index={i}
                  courseId={course.id}
                  chapter={ch}
                  onChange={refresh}
                  onError={fail}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="mt-4 card p-6 text-center text-sm text-muted">
          Aucun chapitre pour l&apos;instant. Ajoutez le premier ci-dessous.
        </div>
      )}

      <AddChapter courseId={course.id} onChange={refresh} onError={fail} />
    </div>
  );
}

/* ---------- Wrapper triable ---------- */
function SortableChapter(props: {
  index: number;
  courseId: string;
  chapter: Chapter;
  onChange: () => void;
  onError: (e: unknown) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.chapter.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  const handle = (
    <button
      {...attributes}
      {...listeners}
      className="grid h-8 w-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted hover:bg-black/[0.04] hover:text-ink active:cursor-grabbing"
      aria-label="Déplacer"
      title="Glisser pour réordonner"
    >
      <IconGrip width={16} height={16} />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      <ChapterBlock {...props} handle={handle} />
    </div>
  );
}

/* ---------- Chapitre ---------- */
function ChapterBlock({
  index,
  courseId,
  chapter,
  onChange,
  onError,
  handle,
}: {
  index: number;
  courseId: string;
  chapter: Chapter;
  onChange: () => void;
  onError: (e: unknown) => void;
  handle?: React.ReactNode;
}) {
  const [openQuiz, setOpenQuiz] = useState(false);
  const [editing, setEditing] = useState(false);

  const [title, setTitle] = useState(chapter.title);
  const [desc, setDesc] = useState(chapter.description || '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  async function remove() {
    if (!confirm('Supprimer ce chapitre ?')) return;
    try {
      const { error } = await supabase.from('chapters').delete().eq('id', chapter.id);
      if (error) throw error;
      onChange();
    } catch (e) {
      onError(e);
    }
  }

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const patch: Record<string, unknown> = {
        title: title.trim(),
        description: desc.trim() || null,
      };
      if (file) {
        setProgress(0);
        patch.video_url = await uploadVideoResumable(courseId, file, setProgress);
      }
      const { error } = await supabase.from('chapters').update(patch).eq('id', chapter.id);
      if (error) throw error;
      setFile(null);
      setEditing(false);
      onChange();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 p-4 sm:gap-3">
        {handle}
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-black/[0.06] text-xs font-bold text-ink">
          {index + 1}
        </span>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${chapter.video_url ? 'bg-black/[0.06] text-ink' : 'bg-black/[0.03] text-muted'}`}>
          <IconPlayFill width={13} height={13} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{chapter.title}</p>
          <p className="text-xs text-muted">
            {chapter.video_url ? 'Vidéo ajoutée' : 'Pas de vidéo'} · {chapter.quiz.length} question(s)
          </p>
        </div>
        <button onClick={() => setEditing((v) => !v)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-black/[0.04] hover:text-ink" aria-label="Modifier" title="Modifier">
          <IconPen width={15} height={15} />
        </button>
        <button onClick={() => setOpenQuiz((v) => !v)} className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted hover:bg-black/[0.04] hover:text-ink">
          Quiz
        </button>
        <button onClick={remove} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600" aria-label="Supprimer">
          <IconX width={16} height={16} />
        </button>
      </div>

      {editing && (
        <div className="space-y-3 border-t border-line p-4">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du chapitre" />
          <RichTextArea value={desc} onChange={setDesc} placeholder="Description (optionnel) — liens, gras, italique" minHeightClass="min-h-[70px]" />
          <div>
            <label className="label">
              {chapter.video_url ? 'Remplacer la vidéo (optionnel)' : 'Ajouter une vidéo'}
            </label>
            <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" disabled={busy} />
            {progress !== null && (
              <div className="mt-2">
                <div className="mb-1 flex justify-between text-xs font-medium text-muted">
                  <span>Envoi de la vidéo…</span>
                  <span className="text-ink">{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07]">
                  <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-60">
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button onClick={() => { setEditing(false); setTitle(chapter.title); setDesc(chapter.description || ''); setFile(null); }} className="btn-outline" disabled={busy}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {openQuiz && (
        <div className="border-t border-line bg-surface/60 p-3">
          <QuizManager chapter={chapter} onChange={onChange} onError={onError} />
        </div>
      )}
    </div>
  );
}

function AddChapter({
  courseId,
  onChange,
  onError,
}: {
  courseId: string;
  onChange: () => void;
  onError: (e: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      let video: string | null = null;
      if (file) {
        setProgress(0);
        video = await uploadVideoResumable(courseId, file, setProgress);
      }
      const { error } = await supabase.from('chapters').insert({
        course_id: courseId,
        title: title.trim(),
        description: desc.trim() || null,
        video_url: video,
        position: Date.now() % 100000,
      });
      if (error) throw error;
      setTitle('');
      setDesc('');
      setFile(null);
      setOpen(false);
      onChange();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn-primary mt-4 w-full">
        <IconPlus width={18} height={18} /> Ajouter un chapitre
      </button>
    );

  return (
    <div className="card mt-4 space-y-3 p-4">
      <p className="font-semibold text-ink">Nouveau chapitre</p>
      <input className="input" placeholder="Titre du chapitre" value={title} onChange={(e) => setTitle(e.target.value)} />
      <RichTextArea value={desc} onChange={setDesc} placeholder="Description (optionnel) — liens, gras, italique" minHeightClass="min-h-[70px]" />
      <div>
        <label className="label">Vidéo</label>
        <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" disabled={busy} />
        {progress !== null && (
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-xs font-medium text-muted">
              <span>Envoi de la vidéo…</span>
              <span className="text-ink">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07]">
              <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="btn-primary disabled:opacity-60">
          {busy ? 'Ajout…' : 'Ajouter le chapitre'}
        </button>
        <button onClick={() => setOpen(false)} className="btn-outline">Annuler</button>
      </div>
    </div>
  );
}

/* ---------- Quiz ---------- */
function QuizManager({
  chapter,
  onChange,
  onError,
}: {
  chapter: Chapter;
  onChange: () => void;
  onError: (e: unknown) => void;
}) {
  const [q, setQ] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correct, setCorrect] = useState(0);
  const [busy, setBusy] = useState(false);
  // Bonnes réponses (visibles admin uniquement, via RPC — masquées en lecture directe)
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase
      .rpc('admin_quiz_answers', { p_chapter_id: chapter.id })
      .then(({ data }) => setAnswers((data as Record<string, number>) ?? {}));
  }, [chapter.id, chapter.quiz.length]);

  async function add() {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q.trim() || opts.length < 2) return onError(new Error('Une question et au moins 2 réponses.'));
    setBusy(true);
    try {
      const { error } = await supabase.from('quiz_questions').insert({
        chapter_id: chapter.id,
        question: q.trim(),
        options: opts,
        correct_index: Math.min(correct, opts.length - 1),
        position: Date.now() % 100000,
      });
      if (error) throw error;
      setQ('');
      setOptions(['', '']);
      setCorrect(0);
      onChange();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  async function del(id: string) {
    try {
      const { error } = await supabase.from('quiz_questions').delete().eq('id', id);
      if (error) throw error;
      onChange();
    } catch (e) {
      onError(e);
    }
  }

  return (
    <div className="space-y-3">
      {chapter.quiz.map((qq) => (
        <div key={qq.id} className="flex items-start gap-2 rounded-md bg-white p-2.5 text-sm">
          <div className="flex-1">
            <p className="font-medium text-ink">{qq.question}</p>
            <p className="text-xs text-muted">
              {qq.options.length} réponses
              {answers[qq.id] !== undefined && ` · bonne : « ${qq.options[answers[qq.id]]} »`}
            </p>
          </div>
          <button onClick={() => del(qq.id)} className="text-muted hover:text-red-600" aria-label="Supprimer">
            <IconX width={15} height={15} />
          </button>
        </div>
      ))}

      <div className="space-y-2 rounded-md bg-white p-3">
        <input className="input" placeholder="Question" value={q} onChange={(e) => setQ(e.target.value)} />
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${chapter.id}`}
              checked={correct === i}
              onChange={() => setCorrect(i)}
              className="h-4 w-4 accent-ink"
              title="Bonne réponse"
            />
            <input
              className="input"
              placeholder={`Réponse ${i + 1}`}
              value={o}
              onChange={(e) => setOptions((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
            />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setOptions((p) => [...p, ''])} className="btn-outline text-xs">
            + Réponse
          </button>
          <button onClick={add} disabled={busy} className="btn-primary text-xs disabled:opacity-60">
            {busy ? 'Ajout…' : 'Ajouter la question'}
          </button>
        </div>
      </div>
    </div>
  );
}
