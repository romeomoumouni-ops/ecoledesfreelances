export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/user';
import SuiviClient from '@/components/SuiviClient';

export default async function SuiviPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');
  return <SuiviClient me={{ id: profile.id, name: profile.full_name }} />;
}
