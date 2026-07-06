export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/user';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/UI';
import NotificationsClient, { type Announcement } from './NotificationsClient';

export const metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');

  const supabase = createClient();
  const { data } = await supabase
    .from('announcements')
    .select('id, title, body, author_name, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        subtitle="Les messages et annonces de l'équipe de L'École des Freelances."
      />
      <NotificationsClient initial={(data ?? []) as Announcement[]} />
    </div>
  );
}
