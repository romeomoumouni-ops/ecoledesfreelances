export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/user';
import ParametresClient from './ParametresClient';

export default async function ParametresPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');

  return (
    <ParametresClient
      profile={{
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        avatarUrl: profile.avatar_url,
        isAdmin: profile.is_admin,
      }}
    />
  );
}
