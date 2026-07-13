'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as tus from 'tus-js-client';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
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
import type { Chapter, Module } from '@/lib/content';
import RichTextArea from '@/components/RichTextArea';
import UploadLeaveGuard from '@/components/UploadLeaveGuard';
import { IconPlus, IconX, IconPlayFill, IconPen, IconGrip, IconBook } from '@/components/Icons';

const VIDEO_UPLOAD_MSG =
  "La vidéo n'a pas fini de se charger. Si tu quittes maintenant, l'envoi sera interrompu et la vidéo ne sera pas enregistrée.";

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
  modules,
}: {
  course: { id: string; title: string };
  chapters: Chapter[];
  modules: Module[];
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<Chapter[]>(chapters);
  const [mods, setMods] = useState<Module[]>(modules);

  // Resynchronise quand les données serveur changent
  useEffect(() => setItems(chapters), [chapters]);
  useEffect(() => setMods(modules), [modules]);

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

  const chaptersOf = (moduleId: string | null) =>
    items.filter((c) => c.module_id === moduleId).sort((a, b) => a.position - b.position);

  /*
   * Glisser-déposer UNIFIÉ (un seul contexte) :
   *  - « module:<id> »    = un module (réordonnable entre modules)
   *  - « chapter:<id> »   = un chapitre (réordonnable ET déplaçable d'un
   *                         module à l'autre, ou vers « non classés »)
   *  - « container:<id> » = le corps d'un module / la zone non classés
   *                         (permet de déposer dans un module vide)
   */
  const [itemsBeforeDrag, setItemsBeforeDrag] = useState<Chapter[] | null>(null);

  // Conteneur (module_id) correspondant à l'élément survolé
  function containerOf(overId: string): string | null | undefined {
    if (overId.startsWith('container:')) {
      const key = overId.slice('container:'.length);
      return key === 'none' ? null : key;
    }
    if (overId.startsWith('chapter:')) {
      const ch = items.find((c) => c.id === overId.slice('chapter:'.length));
      return ch ? ch.module_id : undefined;
    }
    return undefined; // un module (barre de titre) ou rien : ignoré
  }

  function onDragStart(event: { active: { id: string | number } }) {
    if (String(event.active.id).startsWith('chapter:')) setItemsBeforeDrag(items);
  }

  // Pendant le glissement : le chapitre change de conteneur en direct (aperçu)
  function onDragOver(event: DragOverEvent) {
    const activeId = String(event.active.id);
    if (!activeId.startsWith('chapter:') || !event.over) return;
    const target = containerOf(String(event.over.id));
    if (target === undefined) return;
    const chId = activeId.slice('chapter:'.length);
    const ch = items.find((c) => c.id === chId);
    if (!ch || ch.module_id === target) return;
    setItems((prev) => {
      const moving = prev.find((c) => c.id === chId);
      if (!moving) return prev;
      const rest = prev.filter((c) => c.id !== chId);
      const maxPos = rest
        .filter((c) => c.module_id === target)
        .reduce((m, c) => Math.max(m, c.position), -1);
      return [...rest, { ...moving, module_id: target, position: maxPos + 1 }];
    });
  }

  async function onDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    // --- Réordonner les MODULES ---
    if (activeId.startsWith('module:')) {
      if (!overId || overId === activeId || !overId.startsWith('module:')) return;
      const a = activeId.slice('module:'.length);
      const o = overId.slice('module:'.length);
      const oldI = mods.findIndex((m) => m.id === a);
      const newI = mods.findIndex((m) => m.id === o);
      if (oldI < 0 || newI < 0) return;
      const reordered = arrayMove(mods, oldI, newI);
      setMods(reordered);
      try {
        await Promise.all(reordered.map((m, i) => supabase.from('modules').update({ position: i }).eq('id', m.id)));
      } catch (e) {
        fail(e);
        setMods(modules);
      }
      return;
    }

    // --- Déposer un CHAPITRE (réordre et/ou changement de module) ---
    if (!activeId.startsWith('chapter:')) return;
    const snapshot = itemsBeforeDrag;
    setItemsBeforeDrag(null);
    const chId = activeId.slice('chapter:'.length);
    const current = items.find((c) => c.id === chId);
    if (!current) return;
    const container = current.module_id; // conteneur final (mis à jour par onDragOver)

    // Ordre final dans le conteneur cible
    let group = chaptersOf(container);
    if (overId && overId.startsWith('chapter:') && overId !== activeId) {
      const overCh = items.find((c) => c.id === overId.slice('chapter:'.length));
      if (overCh && overCh.module_id === container) {
        const oldI = group.findIndex((c) => c.id === chId);
        const newI = group.findIndex((c) => c.id === overCh.id);
        if (oldI >= 0 && newI >= 0) group = arrayMove(group, oldI, newI);
      }
    }
    const normalized = group.map((c, i) => ({ ...c, position: i }));

    // Renuméroter aussi le conteneur d'origine si le chapitre en a changé
    const sourceContainer = snapshot?.find((c) => c.id === chId)?.module_id;
    const sourceGroup =
      snapshot && sourceContainer !== container
        ? items
            .filter((c) => c.module_id === sourceContainer && c.id !== chId)
            .sort((a, b) => a.position - b.position)
            .map((c, i) => ({ ...c, position: i }))
        : [];

    setItems((prev) =>
      prev.map(
        (c) => normalized.find((n) => n.id === c.id) ?? sourceGroup.find((s) => s.id === c.id) ?? c
      )
    );

    try {
      await Promise.all([
        ...normalized.map((c) =>
          supabase.from('chapters').update({ module_id: container, position: c.position }).eq('id', c.id)
        ),
        ...sourceGroup.map((c) => supabase.from('chapters').update({ position: c.position }).eq('id', c.id)),
      ]);
    } catch (e) {
      fail(e);
      if (snapshot) setItems(snapshot);
    }
  }

  // Déplacer un chapitre vers un autre module (ou vers « non classés »)
  async function moveChapter(chapterId: string, toModuleId: string | null) {
    const target = items.filter((c) => c.module_id === toModuleId);
    const newPos = target.reduce((m, c) => Math.max(m, c.position), -1) + 1;
    setItems((prev) => prev.map((c) => (c.id === chapterId ? { ...c, module_id: toModuleId, position: newPos } : c)));
    try {
      const { error } = await supabase.from('chapters').update({ module_id: toModuleId, position: newPos }).eq('id', chapterId);
      if (error) throw error;
      refresh();
    } catch (e) {
      fail(e);
      refresh();
    }
  }

  async function renameModule(id: string, title: string) {
    try {
      const { error } = await supabase.from('modules').update({ title: title.trim() }).eq('id', id);
      if (error) throw error;
      refresh();
    } catch (e) {
      fail(e);
    }
  }

  async function deleteModule(id: string) {
    if (!confirm('Supprimer ce module ? Les chapitres qu’il contient ne seront pas supprimés : ils repasseront dans « Chapitres non classés ».')) return;
    try {
      const { error } = await supabase.from('modules').delete().eq('id', id);
      if (error) throw error;
      refresh();
    } catch (e) {
      fail(e);
    }
  }

  const ungrouped = chaptersOf(null);

  return (
    <div>
      <h2 className="text-lg font-bold text-ink">Modules &amp; chapitres</h2>
      <p className="mt-1 text-sm text-muted">
        Créez des modules (Module 1, Module 2…) puis ajoutez ou déplacez les chapitres dedans.
        Glissez par la poignée pour réordonner.
      </p>

      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      {/* Un SEUL contexte de glisser-déposer : modules réordonnables ET
          chapitres déplaçables librement entre modules / non classés. */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        {mods.length > 0 && (
          <SortableContext items={mods.map((m) => `module:${m.id}`)} strategy={verticalListSortingStrategy}>
            <div className="mt-4 space-y-4">
              {mods.map((m, mi) => (
                <SortableModule key={m.id} id={`module:${m.id}`}>
                  {(handle) => (
                    <ModuleCard
                      module={m}
                      index={mi}
                      handle={handle}
                      courseId={course.id}
                      chapters={chaptersOf(m.id)}
                      modules={mods}
                      onMove={moveChapter}
                      onRename={renameModule}
                      onDelete={deleteModule}
                      onChange={refresh}
                      onError={fail}
                    />
                  )}
                </SortableModule>
              ))}
            </div>
          </SortableContext>
        )}

        <CreateModule courseId={course.id} nextPos={mods.length} onChange={refresh} onError={fail} />

        {/* Chapitres non classés — zone toujours visible : on peut y déposer
            un chapitre pour le sortir d'un module. */}
        <div className="mt-6">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink">
              {mods.length === 0 ? 'Chapitres' : 'Chapitres non classés'}
            </h3>
            {mods.length > 0 && (
              <span className="text-xs text-muted">
                {ungrouped.length > 0
                  ? '— glisse-les dans un module ci-dessus'
                  : '— dépose ici un chapitre pour le sortir d’un module'}
              </span>
            )}
          </div>
          <ChapterGroup
            courseId={course.id}
            moduleId={null}
            chapters={ungrouped}
            modules={mods}
            onMove={moveChapter}
            onChange={refresh}
            onError={fail}
            emptyLabel="Aucun chapitre ici. Tu peux en déposer un par glisser-déposer."
          />
        </div>
      </DndContext>
    </div>
  );
}

/* ---------- Création d'un module ---------- */
function CreateModule({
  courseId,
  nextPos,
  onChange,
  onError,
}: {
  courseId: string;
  nextPos: number;
  onChange: () => void;
  onError: (e: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('modules').insert({ course_id: courseId, title: title.trim(), position: nextPos });
      if (error) throw error;
      setTitle('');
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
      <button onClick={() => setOpen(true)} className="btn-outline mt-4 w-full">
        <IconPlus width={18} height={18} /> Créer un module
      </button>
    );

  return (
    <div className="card mt-4 space-y-3 p-4">
      <p className="font-semibold text-ink">Nouveau module</p>
      <input
        className="input"
        placeholder="Ex. Module 1 — Les bases"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        autoFocus
      />
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="btn-primary disabled:opacity-60">
          {busy ? 'Création…' : 'Créer le module'}
        </button>
        <button onClick={() => setOpen(false)} className="btn-outline">Annuler</button>
      </div>
    </div>
  );
}

/* ---------- Wrapper triable pour un module ---------- */
function SortableModule({ id, children }: { id: string; children: (handle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 20 : undefined,
  };
  const handle = (
    <button
      {...attributes}
      {...listeners}
      className="grid h-8 w-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted hover:bg-black/[0.06] hover:text-ink active:cursor-grabbing"
      aria-label="Déplacer le module"
      title="Glisser pour réordonner le module"
    >
      <IconGrip width={16} height={16} />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      {children(handle)}
    </div>
  );
}

/* ---------- Carte d'un module ---------- */
function ModuleCard({
  module,
  index,
  handle,
  courseId,
  chapters,
  modules,
  onMove,
  onRename,
  onDelete,
  onChange,
  onError,
}: {
  module: Module;
  index: number;
  handle: React.ReactNode;
  courseId: string;
  chapters: Chapter[];
  modules: Module[];
  onMove: (chapterId: string, toModuleId: string | null) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onChange: () => void;
  onError: (e: unknown) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(module.title);

  useEffect(() => setTitle(module.title), [module.title]);

  return (
    <div className="rounded-xl border border-line bg-[#fafafa]">
      <div className="flex items-center gap-2 px-3 py-3 sm:gap-3">
        {handle}
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-ink text-white">
          <IconBook width={15} height={15} />
        </span>
        {editing ? (
          <input
            className="input flex-1 py-1.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onRename(module.id, title);
                setEditing(false);
              }
            }}
            autoFocus
          />
        ) : (
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-ink">{module.title}</p>
            <p className="text-xs text-muted">Module {index + 1} · {chapters.length} chapitre(s)</p>
          </div>
        )}
        {editing ? (
          <>
            <button
              onClick={() => {
                onRename(module.id, title);
                setEditing(false);
              }}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-ink hover:bg-black/[0.05]"
            >
              OK
            </button>
            <button
              onClick={() => {
                setTitle(module.title);
                setEditing(false);
              }}
              className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-black/[0.05]"
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-black/[0.05] hover:text-ink" aria-label="Renommer" title="Renommer">
              <IconPen width={15} height={15} />
            </button>
            <button onClick={() => onDelete(module.id)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600" aria-label="Supprimer le module" title="Supprimer le module">
              <IconX width={16} height={16} />
            </button>
          </>
        )}
      </div>

      <div className="border-t border-line p-3">
        <ChapterGroup
          courseId={courseId}
          moduleId={module.id}
          chapters={chapters}
          modules={modules}
          onMove={onMove}
          onChange={onChange}
          onError={onError}
          emptyLabel="Aucun chapitre — glisse-en un ici, ou ajoute-en un nouveau."
        />
      </div>
    </div>
  );
}

/* ---------- Groupe de chapitres (triable) + bouton d'ajout ---------- */
function ChapterGroup({
  courseId,
  moduleId,
  chapters,
  modules,
  onMove,
  onChange,
  onError,
  emptyLabel,
}: {
  courseId: string;
  moduleId: string | null;
  chapters: Chapter[];
  modules: Module[];
  onMove: (chapterId: string, toModuleId: string | null) => void;
  onChange: () => void;
  onError: (e: unknown) => void;
  emptyLabel?: string;
}) {
  // Zone déposable : permet de lâcher un chapitre dans un module (même vide)
  // ou dans « non classés ». S'illumine quand un chapitre la survole.
  const { setNodeRef, isOver } = useDroppable({ id: `container:${moduleId ?? 'none'}` });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 rounded-lg transition ${
        isOver ? 'bg-blue-50/70 ring-2 ring-blue-300 ring-offset-2' : ''
      }`}
    >
      {chapters.length ? (
        <SortableContext items={chapters.map((c) => `chapter:${c.id}`)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {chapters.map((ch, i) => (
              <SortableChapter
                key={ch.id}
                index={i}
                courseId={courseId}
                chapter={ch}
                modules={modules}
                onMove={onMove}
                onChange={onChange}
                onError={onError}
              />
            ))}
          </div>
        </SortableContext>
      ) : (
        emptyLabel && (
          <p className="rounded-lg border border-dashed border-line px-3 py-3 text-center text-xs text-muted">
            {emptyLabel}
          </p>
        )
      )}

      <AddChapter courseId={courseId} moduleId={moduleId} onChange={onChange} onError={onError} />
    </div>
  );
}

/* ---------- Wrapper triable pour un chapitre ---------- */
function SortableChapter(props: {
  index: number;
  courseId: string;
  chapter: Chapter;
  modules: Module[];
  onMove: (chapterId: string, toModuleId: string | null) => void;
  onChange: () => void;
  onError: (e: unknown) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `chapter:${props.chapter.id}`,
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
  modules,
  onMove,
  onChange,
  onError,
  handle,
}: {
  index: number;
  courseId: string;
  chapter: Chapter;
  modules: Module[];
  onMove: (chapterId: string, toModuleId: string | null) => void;
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
      <UploadLeaveGuard active={progress !== null} title="Envoi de la vidéo en cours" message={VIDEO_UPLOAD_MSG} />
      <div className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
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

      {/* Emplacement (module) — permet de classer un chapitre, même existant */}
      {modules.length > 0 && (
        <div className="flex items-center gap-2 border-t border-line px-3 py-2 sm:px-4">
          <span className="text-xs text-muted">Module :</span>
          <select
            value={chapter.module_id ?? ''}
            onChange={(e) => onMove(chapter.id, e.target.value || null)}
            className="rounded-md border border-line bg-white px-2 py-1 text-xs text-ink outline-none focus:border-violet-400"
          >
            <option value="">Non classé</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
      )}

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
  moduleId,
  onChange,
  onError,
}: {
  courseId: string;
  moduleId: string | null;
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
        module_id: moduleId,
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
      <button onClick={() => setOpen(true)} className="btn-outline mt-1 w-full">
        <IconPlus width={17} height={17} /> Ajouter un chapitre
      </button>
    );

  return (
    <div className="card mt-1 space-y-3 p-4">
      <UploadLeaveGuard active={progress !== null} title="Envoi de la vidéo en cours" message={VIDEO_UPLOAD_MSG} />
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
