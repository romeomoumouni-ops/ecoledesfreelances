'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import DeviceGuard from './DeviceGuard';
import TranchePayBanner, { type Installment } from './TranchePayBanner';

export type ShellProfile = {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

// Onglets SANS le bouton « Payer ma tranche ».
const TRANCHE_HIDDEN = ['/super-coach', '/ai-post-maker', '/coaching'];

export default function AppShell({
  children,
  profile,
  contactUnread = 0,
  suiviUnread = 0,
  notifUnread = 0,
  communauteUnread = 0,
  installment = null,
}: {
  children: React.ReactNode;
  profile: ShellProfile;
  contactUnread?: number;
  suiviUnread?: number;
  notifUnread?: number;
  communauteUnread?: number;
  installment?: Installment | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(contactUnread);
  const [suivi, setSuivi] = useState(suiviUnread);
  const [notif, setNotif] = useState(notifUnread);
  const [commu, setCommu] = useState(communauteUnread);
  const pathname = usePathname();

  // Resynchronise avec le serveur à chaque navigation / refresh
  useEffect(() => setUnread(contactUnread), [contactUnread]);
  useEffect(() => setSuivi(suiviUnread), [suiviUnread]);
  useEffect(() => setNotif(notifUnread), [notifUnread]);
  useEffect(() => setCommu(communauteUnread), [communauteUnread]);

  // Sur la page notifications, la pastille retombe à zéro (lecture en cours)
  useEffect(() => {
    if (pathname === '/notifications') setNotif(0);
    if (pathname.startsWith('/communaute')) setCommu(0);
  }, [pathname]);

  // Temps réel : nouvelle réponse coach, suivi ou notification → pastille immédiate
  useEffect(() => {
    const supabase = createClient();
    void ensureRealtimeAuth();
    const channel = supabase
      .channel(`unread-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `student_id=eq.${profile.id}` },
        (payload) => {
          const m = payload.new as { from_admin: boolean };
          if (m.from_admin && pathname !== '/contact') setUnread((u) => u + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'followup_messages', filter: `student_id=eq.${profile.id}` },
        (payload) => {
          const m = payload.new as { from_admin: boolean };
          if (m.from_admin && pathname !== '/suivi') setSuivi((u) => u + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        () => {
          if (pathname !== '/notifications') setNotif((n) => n + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => {
          if (pathname !== '/notifications') setNotif((n) => n + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_posts' },
        (payload) => {
          const p = payload.new as { channel: string; user_id: string; flagged?: boolean };
          if (p.flagged || p.user_id === profile.id) return; // signalé ou mon propre post
          if (!pathname.startsWith('/communaute')) setCommu((n) => n + 1);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.id, pathname]);

  return (
    <div className="min-h-screen bg-surface">
      <DeviceGuard />
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        isAdmin={profile.isAdmin}
        contactUnread={unread}
        suiviUnread={suivi}
        communauteUnread={commu}
      />
      <div className="lg:pl-[264px]">
        <Topbar onMenu={() => setMenuOpen(true)} profile={profile} contactUnread={unread} notifUnread={notif} />
        <main className="mx-auto max-w-content px-4 py-6 sm:px-8 sm:py-10">
          {installment && !TRANCHE_HIDDEN.some((p) => pathname.startsWith(p)) && (
            <TranchePayBanner installment={installment} />
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
