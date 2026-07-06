export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import MessagerieClient, { type SentAnnouncement } from './MessagerieClient';

export const metadata = { title: 'Messagerie — Admin' };

export default async function AdminMessageriePage() {
  const supabase = createClient();

  const [{ count }, { data: recent }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_admin', false)
      .eq('banned', false),
    supabase
      .from('announcements')
      .select('id, title, body, created_at')
      .order('created_at', { ascending: false })
      .limit(15),
  ]);

  return <MessagerieClient studentCount={count ?? 0} recent={(recent ?? []) as SentAnnouncement[]} />;
}
