import Link from 'next/link';
import Logo from '@/components/Logo';
import { IconArrowRight } from '@/components/Icons';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="mt-10 text-7xl font-bold text-muted">404</p>
      <h1 className="mt-2 text-2xl font-bold text-ink">Page introuvable</h1>
      <p className="mt-1 max-w-sm text-muted">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Link href="/tableau-de-bord" className="btn-primary mt-6">
        Retour au tableau de bord
        <IconArrowRight width={18} height={18} />
      </Link>
    </div>
  );
}
