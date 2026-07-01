import { redirect } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import AdminNav from '@/components/AdminNav';
import { getCurrentProfile } from '@/lib/user';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');
  if (!profile.is_admin) redirect('/tableau-de-bord');

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-content flex-col gap-3 px-4 py-3 sm:px-8">
          <div className="flex items-center justify-between">
            <Link href="/admin">
              <Logo />
            </Link>
            <span className="chip bg-black/[0.05] text-muted">Administration</span>
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-content px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
