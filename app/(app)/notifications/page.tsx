export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/user';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/UI';
import NotificationsClient, { type Announcement, type PersoNotif } from './NotificationsClient';

export const metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');

  const supabase = createClient();
  const [{ data: anns }, { data: persos }] = await Promise.all([
    supabase
      .from('announcements')
      .select('id, title, body, author_name, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('notifications')
      .select('id, type, actor_name, post_id, comment_id, channel, excerpt, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  // Ouvrir la page = tout est lu. Marqué CÔTÉ SERVEUR pour être fiable à 100 %
  // (la pastille ne « revivra » plus après une actualisation).
  await Promise.all([supabase.rpc('mark_announcements_read'), supabase.rpc('mark_notifications_read')]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notifications" subtitle="Vos interactions et les annonces de l'équipe." />
      <NotificationsClient
        userId={profile.id}
        initialAnnouncements={(anns ?? []) as Announcement[]}
        initialPerso={(persos ?? []) as PersoNotif[]}
      />
    </div>
  );
}
