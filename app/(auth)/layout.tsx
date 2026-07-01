import Link from 'next/link';
import Logo from '@/components/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-6 flex justify-center">
            <Link href="/connexion">
              <Logo />
            </Link>
          </div>
          <div className="card p-7 sm:p-8">{children}</div>
          <p className="mt-6 text-center text-xs text-muted">
            L’École des Freelances — accès réservé aux membres.
          </p>
        </div>
      </div>
    </div>
  );
}
