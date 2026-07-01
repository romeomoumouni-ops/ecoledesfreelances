'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export type ShellProfile = {
  name: string;
  handle: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export default function AppShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: ShellProfile;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} isAdmin={profile.isAdmin} />
      <div className="lg:pl-[264px]">
        <Topbar onMenu={() => setMenuOpen(true)} profile={profile} />
        <main className="mx-auto max-w-content px-4 py-6 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
