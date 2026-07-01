import Link from 'next/link';
import type { Course } from '@/lib/data';
import { IconBook, IconClock, IconArrowRight } from './Icons';

/* ---------- En-tête de page ---------- */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

/* ---------- Barre de progression ---------- */
export function ProgressBar({
  value,
  className = '',
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07] ${className}`}>
      <div
        className="h-full rounded-full bg-ink transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

/* ---------- Badge (monochrome) ---------- */
export function Badge({
  children,
  variant = 'soft',
}: {
  children: React.ReactNode;
  color?: string;
  variant?: 'soft' | 'solid' | 'outline';
}) {
  if (variant === 'solid') {
    return <span className="chip bg-ink text-white">{children}</span>;
  }
  if (variant === 'outline') {
    return <span className="chip border border-line bg-white text-muted">{children}</span>;
  }
  return <span className="chip bg-black/[0.05] text-ink/75">{children}</span>;
}

/* ---------- Carte statistique ---------- */
export function StatCard({
  label,
  value,
  Icon,
  hint,
  note,
}: {
  label: string;
  value: string;
  Icon: (p: { width?: number; height?: number }) => JSX.Element;
  color?: string;
  hint?: string;
  note?: string;
}) {
  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-black/[0.04] text-ink">
          <Icon width={19} height={19} />
        </span>
        {hint && <span className="text-xs font-medium text-muted">{hint}</span>}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-ink">{label}</p>
      {note && (
        <p className="mt-1.5 text-xs leading-snug text-muted">{note}</p>
      )}
    </div>
  );
}

/* ---------- Carte de formation (épurée) ---------- */
export function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/catalogue/${course.id}`}
      className="card group flex flex-col p-5 transition-all duration-200 hover:border-[#e0e0de] hover:shadow-soft"
    >
      <div className="flex items-start justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-black/[0.04] text-ink transition group-hover:bg-black/[0.06]">
          <IconBook width={20} height={20} />
        </span>
        {course.tag && (
          <span className="chip bg-black/[0.05] text-[11px] text-muted">{course.tag}</span>
        )}
      </div>

      <h3 className="mt-4 line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
        {course.title}
      </h3>
      <p className="mt-1 text-xs text-muted">
        {course.category} · Par {course.instructor}
      </p>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <IconBook width={14} height={14} /> {course.lessons} leçons
        </span>
        <span className="flex items-center gap-1.5">
          <IconClock width={14} height={14} /> {course.hours} h
        </span>
      </div>

      {course.progress !== undefined ? (
        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs font-medium">
            <span className="text-muted">Progression</span>
            <span className="text-ink">{course.progress}%</span>
          </div>
          <ProgressBar value={course.progress} />
        </div>
      ) : (
        <div className="mt-5 flex items-center justify-between border-t border-line pt-3.5">
          <span className="text-sm text-muted">Pas encore commencée</span>
          <span className="flex items-center gap-1 text-sm font-semibold text-ink transition group-hover:gap-1.5">
            Commencer <IconArrowRight width={15} height={15} />
          </span>
        </div>
      )}
    </Link>
  );
}

/* ---------- Section vide ---------- */
export function EmptyState({
  title,
  text,
  Icon,
}: {
  title: string;
  text: string;
  Icon: (p: { width?: number; height?: number }) => JSX.Element;
}) {
  return (
    <div className="card flex flex-col items-center justify-center py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-xl bg-black/[0.04] text-muted">
        <Icon width={26} height={26} />
      </span>
      <p className="mt-4 text-lg font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>
    </div>
  );
}
