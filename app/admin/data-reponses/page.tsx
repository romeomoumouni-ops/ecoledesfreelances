import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/user';
import { redirect } from 'next/navigation';
import DataReponsesClient from './DataReponsesClient';

export const dynamic = 'force-dynamic';

export type DataItem = {
  id: string;
  kind: 'text' | 'pdf' | 'url';
  title: string;
  source: string | null;
  chars: number;
  created_at: string;
};

export default async function DataReponsesPage() {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) redirect('/tableau-de-bord');

  const supabase = createClient();
  const [{ data: items }, { data: pilots }] = await Promise.all([
    supabase
      .from('coach_reply_data')
      .select('id, kind, title, source, chars, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('coach_autopilot').select('coach_key, enabled'),
  ]);

  return (
    <DataReponsesClient
      items={(items ?? []) as DataItem[]}
      pilots={Object.fromEntries((pilots ?? []).map((p) => [p.coach_key, p.enabled]))}
    />
  );
}
