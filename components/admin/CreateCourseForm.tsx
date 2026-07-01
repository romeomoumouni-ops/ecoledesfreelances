'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IconCamera } from '@/components/Icons';

const supabase = createClient();

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

export default function CreateCourseForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Design');
  const [level, setLevel] = useState('Débutant');
  const [instructor, setInstructor] = useState('');
  const [lessons, setLessons] = useState('');
  const [hours, setHours] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function pickThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setThumbFile(f);
    setThumbPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const id = `${slugify(title) || 'cours'}-${Date.now().toString(36).slice(-4)}`;

      let thumbnail_url: string | null = null;
      if (thumbFile) {
        const ext = thumbFile.name.split('.').pop() || 'jpg';
        const path = `thumbnails/${id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('course-media')
          .upload(path, thumbFile, { upsert: true, cacheControl: '3600' });
        if (upErr) throw upErr;
        thumbnail_url = supabase.storage.from('course-media').getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase.from('courses').insert({
        id,
        title: title.trim(),
        category,
        level,
        instructor: instructor.trim(),
        description: description.trim(),
        lessons: Number(lessons) || 0,
        hours: Number(hours) || 0,
        tag: tag.trim() || null,
        thumbnail_url,
        color: '#1d1d1f',
        rating: 0,
        students: 0,
        sort: Date.now() % 100000,
      });
      if (error) throw error;

      router.push(`/admin/cours/${id}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur lors de la création.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      {/* Miniature */}
      <div>
        <label className="label">Miniature du cours</label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-black/[0.02] text-muted transition hover:border-[#dcdcda]"
        >
          {thumbPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs">
              <IconCamera width={22} height={22} />
              Ajouter une image
            </span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickThumb} />
      </div>

      <div>
        <label className="label">Titre *</label>
        <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Devenir Designer UI/UX" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Catégorie</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>Design</option>
            <option>Développement</option>
            <option>Marketing</option>
            <option>Rédaction</option>
            <option>Vidéo</option>
            <option>Business</option>
          </select>
        </div>
        <div>
          <label className="label">Niveau</label>
          <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option>Débutant</option>
            <option>Intermédiaire</option>
            <option>Avancé</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Formateur</label>
        <input className="input" value={instructor} onChange={(e) => setInstructor(e.target.value)} placeholder="Nom du formateur" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Leçons</label>
          <input className="input" type="number" min="0" value={lessons} onChange={(e) => setLessons(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">Heures</label>
          <input className="input" type="number" min="0" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div>
        <label className="label">Étiquette (optionnel)</label>
        <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Ex. Nouveau, Populaire…" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input min-h-[80px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ce que le cours apporte…" />
      </div>
      <button className="btn-primary w-full disabled:opacity-60" disabled={busy}>
        {busy ? 'Création…' : 'Publier le cours'}
      </button>
    </form>
  );
}
