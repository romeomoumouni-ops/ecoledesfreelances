export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getAssignments } from '@/lib/db';
import { getCurrentProfile } from '@/lib/user';
import { createClient } from '@/lib/supabase/server';
import DevoirsClient from './DevoirsClient';

export default async function DevoirsPage() {
  const [assignments, profile] = await Promise.all([getAssignments(), getCurrentProfile()]);
  if (!profile) redirect('/connexion');

  const supabase = createClient();
  const { data: subs } = await supabase
    .from('assignment_submissions')
    .select('assignment_id')
    .eq('user_id', profile.id);

  return (
    <DevoirsClient
      userId={profile.id}
      assignments={assignments}
      submittedIds={(subs ?? []).map((s) => s.assignment_id as string)}
    />
  );
}
