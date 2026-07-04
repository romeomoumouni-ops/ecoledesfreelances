'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import DeviceGuard from './DeviceGuard';

export type ShellProfile = {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export default function AppShell({
  children,
  profile,
  contactUnread = 0,
  suiviUnread = 0,
}: {
  children: React.ReactNode;
  profile: ShellProfile;
  contactUnread?: number;
  suiviUnread?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(contactUnread);
  const [suivi, setSuivi] = useState(suiviUnread);
  const pathname = usePathname();

  // Resynchronise avec le serveur à chaque navigation / refresh
  useEffect(() => setUnread(contactUnread), [contactUnread]);
  useEffect(() => setSuivi(suiviUnread), [suiviUnread]);

  // Temps réel : nouvelle réponse coach ou chargé de suivi → pastille immédiate
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
      />
      <div className="lg:pl-[264px]">
        <Topbar onMenu={() => setMenuOpen(true)} profile={profile} contactUnread={unread} />
        <main className="mx-auto max-w-content px-4 py-6 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
