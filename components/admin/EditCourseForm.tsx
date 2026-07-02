'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Course } from '@/lib/data';
import RichTextArea from '@/components/RichTextArea';
import { IconCamera } from '@/components/Icons';

const supabase = createClient();

export default function EditCourseForm({ course }: { course: Course }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(course.title);
  const [instructor, setInstructor] = useState(course.instructor || '');
  const [tag, setTag] = useState(course.tag || '');
  const [lessons, setLessons] = useState(String(course.lessons || 0));
  const [hours, setHours] = useState(String(course.hours || 0));
  const [description, setDescription] = useState(course.description || '');
  const [thumb, setThumb] = useState<string | null>(course.thumbnail_url ?? null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  function flash(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function changeThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setBusy(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `thumbnails/${course.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('course-media')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { error } = await supabase.from('courses').update({ thumbnail_url: path }).eq('id', course.id);
      if (error) throw error;
      // Aperçu immédiat via une URL signée
      const { data: signed } = await supabase.storage.from('course-media').createSignedUrl(path, 60 * 60 * 4);
      setThumb(signed?.signedUrl ?? null);
      flash(true, 'Miniature mise à jour.');
      router.refresh();
    } catch {
      flash(false, "Échec de l'envoi de la miniature.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          title: title.trim(),
          instructor: instructor.trim(),
          tag: tag.trim() || null,
          lessons: Number(lessons) || 0,
          hours: Number(hours) || 0,
          description: description.trim(),
        })
        .eq('id', course.id);
      if (error) throw error;
      flash(true, 'Cours enregistré.');
      router.refresh();
    } catch {
      flash(false, "Échec de l'enregistrement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-4 font-bold text-ink">Infos du cours</h2>

      {toast && (
        <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${toast.ok ? 'bg-black/[0.04] text-ink' : 'bg-red-50 text-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
        {/* Miniature */}
        <div>
          <label className="label">Miniature</label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-black/[0.02] text-muted transition hover:border-[#dcdcda] disabled:opacity-60"
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-xs">
                <IconCamera width={22} height={22} />
                Ajouter une image
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={changeThumb} />
          <p className="mt-1 text-xs text-muted">Cliquez pour changer la miniature.</p>
        </div>

        {/* Champs */}
        <div className="space-y-3">
          <div>
            <label className="label">Titre</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Formateur</label>
            <input className="input" value={instructor} onChange={(e) => setInstructor(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Leçons</label>
              <input className="input" type="number" min="0" value={lessons} onChange={(e) => setLessons(e.target.value)} />
            </div>
            <div>
              <label className="label">Heures</label>
              <input className="input" type="number" min="0" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
            <div>
              <label className="label">Étiquette</label>
              <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Nouveau…" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <RichTextArea value={description} onChange={setDescription} minHeightClass="min-h-[70px]" />
          </div>
          <div className="flex justify-end">
            <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-60">
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
