'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { deleteCourse } from '@/lib/admin-actions';
import type { Course } from '@/lib/data';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
import { IconBook, IconX, IconChevronRight, IconGrip } from '@/components/Icons';

const supabase = createClient();

export default function CoursesReorderList({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Course[]>(courses);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setItems(courses);
  }, [courses]);

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
      // Persiste le nouvel ordre (sort = index)
      await Promise.all(
        reordered.map((c, i) => supabase.from('courses').update({ sort: i }).eq('id', c.id))
      );
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Une erreur est survenue.');
      setTimeout(() => setErr(null), 5000);
      setItems(courses); // rollback
    }
  }

  if (!items.length) {
    return (
      <div className="card p-8 text-center text-sm text-muted">
        Aucun cours pour l&apos;instant. Créez-en un avec le formulaire → vous serez ensuite
        amené sur sa page pour ajouter les <b className="text-ink">chapitres</b>,
        <b className="text-ink"> les vidéos</b> et les <b className="text-ink">quiz</b>.
      </div>
    );
  }

  return (
    <>
      <p className="mb-3 text-sm text-muted">
        Glissez un cours par la poignée pour changer son ordre d&apos;affichage dans l&apos;application.
      </p>
      {err && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((c) => (
              <SortableCourse key={c.id} course={c} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
}

function SortableCourse({ course: c }: { course: Course }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: c.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="card flex items-center gap-2 p-3 sm:gap-3">
      <button
        {...attributes}
        {...listeners}
        className="grid h-9 w-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted hover:bg-black/[0.04] hover:text-ink active:cursor-grabbing"
        aria-label="Déplacer"
        title="Glisser pour réordonner"
      >
        <IconGrip width={16} height={16} />
      </button>

      <Link href={`/admin/cours/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        {c.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.thumbnail_url} alt="" className="h-12 w-20 shrink-0 rounded-md object-cover" />
        ) : (
          <span className="grid h-12 w-20 shrink-0 place-items-center rounded-md bg-black/[0.04] text-muted">
            <IconBook width={18} height={18} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{c.title}</p>
          <p className="truncate text-xs text-muted">
            {c.instructor ? c.instructor : `${c.lessons} leçon(s)`}
          </p>
        </div>
        <span className="hidden items-center gap-1 text-xs font-semibold text-muted sm:flex">
          Contenu <IconChevronRight width={14} height={14} />
        </span>
      </Link>

      <form action={deleteCourse.bind(null, c.id)}>
        <button
          className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600"
          aria-label="Supprimer"
          title="Supprimer le cours"
        >
          <IconX width={18} height={18} />
        </button>
      </form>
    </div>
  );
}
