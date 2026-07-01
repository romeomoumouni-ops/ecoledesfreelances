import Link from 'next/link';
import { IconPlayFill, IconChevronRight } from '@/components/Icons';

export default function LeconPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/mes-formations"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
      >
        <IconChevronRight width={16} height={16} className="rotate-180" /> Retour à mes cours
      </Link>

      <div className="card flex flex-col items-center px-6 py-16 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-black/[0.04] text-ink">
          <IconPlayFill width={26} height={26} />
        </span>
        <h1 className="mt-5 text-xl font-bold text-ink">Le lecteur de cours arrive bientôt</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
          La lecture des leçons (vidéos, ressources, suivi de progression) sera disponible dès que
          vos formateurs auront ajouté le contenu des cours depuis l&apos;espace d&apos;administration.
        </p>
        <Link href="/tableau-de-bord" className="btn-primary mt-6">
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
