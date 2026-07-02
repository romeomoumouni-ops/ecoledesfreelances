'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

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
}: {
  children: React.ReactNode;
  profile: ShellProfile;
  contactUnread?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(contactUnread);
  const pathname = usePathname();

  // Resynchronise avec le serveur à chaque navigation / refresh
  useEffect(() => {
    setUnread(contactUnread);
  }, [contactUnread]);

  // Temps réel : une réponse de coach arrive → pastille immédiate
  useEffect(() => {
    const supabase = createClient();
    void ensureRealtimeAuth();
    const channel = supabase
      .channel(`unread-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `student_id=eq.${profile.id}`,
        },
        (payload) => {
          const m = payload.new as { from_admin: boolean };
          if (m.from_admin && pathname !== '/contact') setUnread((u) => u + 1);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.id, pathname]);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        isAdmin={profile.isAdmin}
        contactUnread={unread}
      />
      <div className="lg:pl-[264px]">
        <Topbar onMenu={() => setMenuOpen(true)} profile={profile} contactUnread={unread} />
        <main className="mx-auto max-w-content px-4 py-6 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
