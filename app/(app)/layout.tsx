import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { getCurrentProfile } from '@/lib/user';

export const dynamic = 'force-dynamic';

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');

  return (
    <AppShell
      profile={{
        name: profile.full_name,
        handle: profile.handle,
        email: profile.email,
        avatarUrl: profile.avatar_url,
        isAdmin: profile.is_admin,
      }}
    >
      {children}
    </AppShell>
  );
}
