'use client';

import Link from 'next/link';
import Avatar from './Avatar';
import type { ShellProfile } from './AppShell';
import { IconMenu, IconChevronDown, IconChat, IconBell } from './Icons';

function initials(name: string, email: string) {
  const base = name || email || 'M';
  return base
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Topbar({
  onMenu,
  profile,
  contactUnread = 0,
  notifUnread = 0,
}: {
  onMenu?: () => void;
  profile: ShellProfile;
  contactUnread?: number;
  notifUnread?: number;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface/80 px-4 backdrop-blur-xl sm:px-8">
      <button
        onClick={onMenu}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-black/[0.05] lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <IconMenu />
      </button>

      <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
        {/* Notifications / messages de la plateforme (pastille non-lus en direct) */}
        <Link
          href="/notifications"
          className="relative grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-black/[0.05] hover:text-ink"
          aria-label="Notifications"
        >
          <IconBell width={19} height={19} />
          {notifUnread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {notifUnread > 9 ? '9+' : notifUnread}
            </span>
          )}
        </Link>

        {/* Messages coachs (avec pastille non-lus, mise à jour en direct) */}
        <Link
          href="/contact"
          className="relative grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-black/[0.05] hover:text-ink"
          aria-label="Messages des coachs"
        >
          <IconChat width={19} height={19} />
          {contactUnread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {contactUnread > 9 ? '9+' : contactUnread}
            </span>
          )}
        </Link>

        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />

        <Link
          href="/parametres"
          className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-1.5 transition hover:bg-black/[0.04]"
        >
          <Avatar
            initials={initials(profile.name, profile.email)}
            src={profile.avatarUrl}
            size={34}
          />
          <span className="hidden text-left sm:block">
            <span className="block max-w-[160px] truncate text-sm font-semibold leading-tight text-ink">
              {profile.name}
            </span>
            <span className="block max-w-[160px] truncate text-xs text-muted">{profile.email}</span>
          </span>
          <span className="hidden text-muted sm:block">
            <IconChevronDown width={15} height={15} />
          </span>
        </Link>
      </div>
    </header>
  );
}
