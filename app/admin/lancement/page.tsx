import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/user';
import { redirect } from 'next/navigation';
import LancementClient from './LancementClient';

export const dynamic = 'force-dynamic';

export type LaunchRun = {
  id: string;
  title: string;
  checks: Record<string, boolean>;
  notes: string | null;
  ads_launched_at: string | null;
  created_at: string;
  updated_at: string;
};

export default async function LancementPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');
  // Réservé au super admin (le middleware redirige déjà ; double garde ici)
  if (!profile.is_super_admin) redirect('/admin');

  const supabase = createClient();
  const { data } = await supabase
    .from('launch_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return <LancementClient runs={(data ?? []) as LaunchRun[]} />;
}
