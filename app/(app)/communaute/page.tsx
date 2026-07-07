export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/user';
import { markScopeRead } from '@/lib/read-marks';
import CommunityClient from '@/components/CommunityClient';

export default async function CommunautePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');

  // Ouverture de la page = tout est lu → la pastille « Communauté » retombe.
  await markScopeRead(profile.id, 'communaute');

  return (
    <CommunityClient
      me={{
        id: profile.id,
        name: profile.full_name,
        isAdmin: profile.is_admin,
        avatarUrl: profile.avatar_url,
      }}
    />
  );
}
