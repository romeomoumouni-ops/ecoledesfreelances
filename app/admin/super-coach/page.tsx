import { createClient } from '@/lib/supabase/server';
import SuperCoachAdminClient from './SuperCoachAdminClient';

export const dynamic = 'force-dynamic';

export type Knowledge = { id: string; title: string; content: string; created_at: string };

export default async function AdminSuperCoachPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('coach_knowledge')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false });

  return <SuperCoachAdminClient items={(data ?? []) as Knowledge[]} />;
}
