'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Curriculum } from '@/lib/content';
import { IconPlus, IconX, IconChevronRight, IconPlayFill } from '@/components/Icons';

const supabase = createClient();

async function uploadToMedia(courseId: string, folder: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${folder}/${courseId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('course-media')
    .upload(path, file, { upsert: false, cacheControl: '3600' });
  if (error) throw error;
  return supabase.storage.from('course-media').getPublicUrl(path).data.publicUrl;
}

export default function CourseBuilder({
  course,
  tree,
}: {
  course: { id: string; title: string };
  tree: Curriculum[];
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  function fail(e: unknown) {
    setErr(e instanceof Error ? e.message : 'Une erreur est survenue.');
    setTimeout(() => setErr(null), 5000);
  }
  const refresh = () => router.refresh();

  return (
    <div>
      <Link href="/admin/cours" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <IconChevronRight width={16} height={16} className="rotate-180" /> Tous les cours
      </Link>
      <h1 className="text-xl font-bold text-ink">{course.title}</h1>
      <p className="mt-1 text-sm text-muted">Construisez le contenu : curriculums → chapitres (vidéos) → quiz.</p>

      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      <div className="mt-6 space-y-5">
        {tree.map((cur) => (
          <CurriculumBlock key={cur.id} courseId={course.id} cur={cur} onChange={refresh} onError={fail} />
        ))}
      </div>

      <AddCurriculum courseId={course.id} onChange={refresh} onError={fail} />
    </div>
  );
}

/* ---------- Curriculum ---------- */
function CurriculumBlock({
  courseId,
  cur,
  onChange,
  onError,
}: {
  courseId: string;
  cur: Curriculum;
  onChange: () => void;
  onError: (e: unknown) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirm('Supprimer ce curriculum et tous ses chapitres ?')) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('curriculums').delete().eq('id', cur.id);
      if (error) throw error;
      onChange();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line p-4">
        {cur.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cur.thumbnail_url} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover" />
        ) : (
          <div className="grid h-12 w-16 shrink-0 place-items-center rounded-md bg-black/[0.04] text-xs text-muted">
            miniature
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{cur.title}</p>
          <p className="text-xs text-muted">{cur.chapters.length} chapitre(s)</p>
        </div>
        <button
          onClick={remove}
          disabled={busy}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
          aria-label="Supprimer"
        >
          <IconX width={18} height={18} />
        </button>
      </div>

      <div className="space-y-2 p-4">
        {cur.chapters.map((ch) => (
          <ChapterBlock key={ch.id} chapter={ch} onChange={onChange} onError={onError} />
        ))}
        <AddChapter courseId={courseId} curriculumId={cur.id} onChange={onChange} onError={onError} />
      </div>
    </div>
  );
}

function AddCurriculum({ courseId, onChange, onError }: { courseId: string; onChange: () => void; onError: (e: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      let thumb: string | null = null;
      if (file) thumb = await uploadToMedia(courseId, 'thumbnails', file);
      const { error } = await supabase
        .from('curriculums')
        .insert({ course_id: courseId, title: title.trim(), thumbnail_url: thumb, position: Date.now() % 100000 });
      if (error) throw error;
      setTitle('');
      setFile(null);
      setOpen(false);
      onChange();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn-outline mt-5 w-full">
        <IconPlus width={18} height={18} /> Ajouter un curriculum
      </button>
    );

  return (
    <div className="card mt-5 space-y-3 p-4">
      <p className="font-semibold text-ink">Nouveau curriculum</p>
      <input className="input" placeholder="Titre du curriculum" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div>
        <label className="label">Miniature (image)</label>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="btn-primary disabled:opacity-60">
          {busy ? 'Ajout…' : 'Créer'}
        </button>
        <button onClick={() => setOpen(false)} className="btn-outline">Annuler</button>
      </div>
    </div>
  );
}

/* ---------- Chapitre ---------- */
function ChapterBlock({
  chapter,
  onChange,
  onError,
}: {
  chapter: Curriculum['chapters'][number];
  onChange: () => void;
  onError: (e: unknown) => void;
}) {
  const [openQuiz, setOpenQuiz] = useState(false);
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

  return (
    <div className="rounded-lg border border-line">
      <div className="flex items-center gap-3 p-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${chapter.video_url ? 'bg-black/[0.06] text-ink' : 'bg-black/[0.03] text-muted'}`}>
          <IconPlayFill width={13} height={13} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{chapter.title}</p>
          <p className="text-xs text-muted">
            {chapter.video_url ? 'Vidéo ajoutée' : 'Pas de vidéo'} · {chapter.quiz.length} question(s) de quiz
          </p>
        </div>
        <button onClick={() => setOpenQuiz((v) => !v)} className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted hover:bg-black/[0.04] hover:text-ink">
          Quiz
        </button>
        <button onClick={remove} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600" aria-label="Supprimer">
          <IconX width={16} height={16} />
        </button>
      </div>
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
  curriculumId,
  onChange,
  onError,
}: {
  courseId: string;
  curriculumId: string;
  onChange: () => void;
  onError: (e: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      let video: string | null = null;
      if (file) video = await uploadToMedia(courseId, 'videos', file);
      const { error } = await supabase.from('chapters').insert({
        course_id: courseId,
        curriculum_id: curriculumId,
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
    }
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-sm font-semibold text-muted hover:border-[#dcdcda] hover:text-ink">
        <IconPlus width={16} height={16} /> Ajouter un chapitre
      </button>
    );

  return (
    <div className="rounded-lg border border-line p-3 space-y-2.5">
      <p className="text-sm font-semibold text-ink">Nouveau chapitre</p>
      <input className="input" placeholder="Titre du chapitre" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input min-h-[60px] resize-none" placeholder="Description (optionnel)" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <div>
        <label className="label">Vidéo</label>
        <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        {busy && <p className="mt-1 text-xs text-muted">Envoi de la vidéo… (peut prendre un moment)</p>}
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="btn-primary disabled:opacity-60">
          {busy ? 'Ajout…' : 'Ajouter'}
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
  chapter: Curriculum['chapters'][number];
  onChange: () => void;
  onError: (e: unknown) => void;
}) {
  const [q, setQ] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correct, setCorrect] = useState(0);
  const [busy, setBusy] = useState(false);

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
              {qq.options.length} réponses · bonne : « {qq.options[qq.correct_index]} »
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
