'use client';

import Link from 'next/link';
import Avatar from './Avatar';
import type { ShellProfile } from './AppShell';
import { IconMenu, IconChevronDown } from './Icons';

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
}: {
  onMenu?: () => void;
  profile: ShellProfile;
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
