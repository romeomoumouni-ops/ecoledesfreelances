export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/user';
import CommunityClient from '@/components/CommunityClient';
import MarkScopeRead from '@/components/MarkScopeRead';

export default async function CommunautePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');

  return (
    <>
      <MarkScopeRead userId={profile.id} scope="communaute" />
      <CommunityClient
        me={{
          id: profile.id,
          name: profile.full_name,
          isAdmin: profile.is_admin,
          avatarUrl: profile.avatar_url,
        }}
      />
    </>
  );
}
