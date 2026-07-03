import { redirect } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import AdminNav from '@/components/AdminNav';
import { getCurrentProfile } from '@/lib/user';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Messages d'élèves non lus par CET admin (tous coachs confondus). */
async function getMessagesUnread(adminId: string): Promise<number> {
  const supabase = createClient();
  const [{ data: msgs }, { data: marks }] = await Promise.all([
    supabase
      .from('support_messages')
      .select('recipient, student_id, created_at')
      .eq('from_admin', false),
    supabase.from('read_marks').select('scope, last_read_at').eq('user_id', adminId),
  ]);
  const readAt = new Map((marks ?? []).map((m) => [m.scope, new Date(m.last_read_at).getTime()]));
  return (msgs ?? []).filter((m) => {
    const seen = readAt.get(`admincv:${m.recipient}:${m.student_id}`) ?? 0;
    return new Date(m.created_at).getTime() > seen;
  }).length;
}

/** Messages de suivi non lus par CET admin (tous élèves confondus). */
async function getSuiviUnread(adminId: string): Promise<number> {
  const supabase = createClient();
  const [{ data: msgs }, { data: marks }] = await Promise.all([
    supabase.from('followup_messages').select('student_id, created_at').eq('from_admin', false),
    supabase.from('read_marks').select('scope, last_read_at').eq('user_id', adminId),
  ]);
  const readAt = new Map((marks ?? []).map((m) => [m.scope, new Date(m.last_read_at).getTime()]));
  return (msgs ?? []).filter((m) => {
    const seen = readAt.get(`suivicv:${m.student_id}`) ?? 0;
    return new Date(m.created_at).getTime() > seen;
  }).length;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');
  if (!profile.is_admin) redirect('/tableau-de-bord');

  const [messagesUnread, suiviUnread] = await Promise.all([
    getMessagesUnread(profile.id),
    getSuiviUnread(profile.id),
  ]);

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-content flex-col gap-3 px-4 py-3 sm:px-8">
          <div className="flex items-center justify-between">
            <Link href="/admin">
              <Logo />
            </Link>
            <span className="chip bg-black/[0.05] text-muted">Administration</span>
          </div>
          <AdminNav messagesUnread={messagesUnread} suiviUnread={suiviUnread} superAdmin={!!profile.is_super_admin} />
        </div>
      </header>
      <main className="mx-auto max-w-content px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
