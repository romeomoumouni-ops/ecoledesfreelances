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

  // On envoie TOUS les profils (avec is_admin) : le client liste les élèves pour
  // démarrer un suivi, + tout compte ayant déjà une conversation (même admin).
  const students = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
    email: p.email,
    avatar: p.avatar_url,
    isAdmin: p.is_admin,
  }));

  return <AdminSuiviClient me={{ id: profile.id, name: profile.full_name }} students={students} />;
}
