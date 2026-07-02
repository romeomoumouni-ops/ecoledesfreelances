import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/user';
import { redirect } from 'next/navigation';
import AdminSuiviClient from './AdminSuiviClient';

export const dynamic = 'force-dynamic';

export default async function AdminSuiviPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');

  const supabase = createClient();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, is_admin')
    .order('created_at', { ascending: true });

  const students = (profiles ?? [])
    .filter((p) => !p.is_admin)
    .map((p) => ({ id: p.id, name: p.full_name, email: p.email, avatar: p.avatar_url }));

  return <AdminSuiviClient me={{ id: profile.id, name: profile.full_name }} students={students} />;
}
