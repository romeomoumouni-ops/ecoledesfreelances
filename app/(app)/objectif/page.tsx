export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentProfile, getMyTaskKeys } from '@/lib/user';
import ObjectifClient from '@/components/ObjectifClient';

export default async function ObjectifPage() {
  const [profile, keys] = await Promise.all([getCurrentProfile(), getMyTaskKeys()]);
  if (!profile) redirect('/connexion');
  return <ObjectifClient userId={profile.id} initialKeys={keys} />;
}
