import { createClient } from '@/lib/supabase/server';
import SuperCoachAdminClient from './SuperCoachAdminClient';

export const dynamic = 'force-dynamic';

export type Knowledge = { id: string; title: string; content: string; created_at: string };
export type Faq = { id: string; question: string; answer: string; created_at: string };
export type CoachStats = {
  users_total: number;
  users_today: number;
  users_month: number;
  msgs_total: number;
  ai_total: number;
  ai_today: number;
  ai_month: number;
  cost_total_usd: number;
  cost_today_usd: number;
  cost_month_usd: number;
  recharges_fcfa: number;
  daily: { jour: string; questions: number; cout_usd: number }[];
};

export default async function AdminSuperCoachPage() {
  const supabase = createClient();
  const [{ data: knowledge }, { data: faq }, { data: stats }] = await Promise.all([
    supabase
      .from('coach_knowledge')
      .select('id, title, content, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('coach_faq')
      .select('id, question, answer, created_at')
      .order('created_at', { ascending: false }),
    supabase.rpc('super_coach_stats'),
  ]);

  // Crédit chargé chez Anthropic (modifiable via la variable Vercel SUPER_COACH_CREDIT_USD)
  const creditUsd = Number(process.env.SUPER_COACH_CREDIT_USD || '20');

  return (
    <SuperCoachAdminClient
      items={(knowledge ?? []) as Knowledge[]}
      faq={(faq ?? []) as Faq[]}
      stats={(stats ?? null) as CoachStats | null}
      creditUsd={creditUsd}
    />
  );
}
