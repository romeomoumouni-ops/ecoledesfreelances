import { createClient } from '@/lib/supabase/server';
import SuperCoachAdminClient from './SuperCoachAdminClient';

export const dynamic = 'force-dynamic';

export type Knowledge = { id: string; title: string; content: string; created_at: string };
export type Faq = { id: string; question: string; answer: string; created_at: string };

export default async function AdminSuperCoachPage() {
  const supabase = createClient();
  const [{ data: knowledge }, { data: faq }] = await Promise.all([
    supabase
      .from('coach_knowledge')
      .select('id, title, content, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('coach_faq')
      .select('id, question, answer, created_at')
      .order('created_at', { ascending: false }),
  ]);

  return <SuperCoachAdminClient items={(knowledge ?? []) as Knowledge[]} faq={(faq ?? []) as Faq[]} />;
}
