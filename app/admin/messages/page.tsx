export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/user';
import AdminMessagesClient from './AdminMessagesClient';

export default async function AdminMessagesPage() {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) redirect('/tableau-de-bord');

  return <AdminMessagesClient me={{ id: profile.id, name: profile.full_name }} />;
}
