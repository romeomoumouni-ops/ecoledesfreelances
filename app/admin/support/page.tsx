import { getCurrentProfile } from '@/lib/user';
import { redirect } from 'next/navigation';
import SupportAdminClient from './SupportAdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminSupportPage() {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) redirect('/tableau-de-bord');
  return <SupportAdminClient />;
}
