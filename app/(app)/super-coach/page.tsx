import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/user';
import { createClient } from '@/lib/supabase/server';
import SuperCoachClient from './SuperCoachClient';

export const dynamic = 'force-dynamic';

export default async function SuperCoachPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');

  const supabase = createClient();
  const [{ data: founder }, { data: history }] = await Promise.all([
    supabase.rpc('founder_profile'),
    supabase
      .from('super_coach_messages')
      .select('role, content, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: true })
      .limit(200),
  ]);

  const f = (founder ?? {}) as { name?: string; avatar_url?: string | null };

  return (
    <SuperCoachClient
      me={{ name: profile.full_name }}
      coachAvatar={f.avatar_url ?? null}
      history={(history ?? []).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))}
    />
  );
}
