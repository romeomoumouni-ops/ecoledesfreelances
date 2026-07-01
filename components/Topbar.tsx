'use client';

import Avatar from './Avatar';
import { currentUser } from '@/lib/data';
import { IconSearch, IconBell, IconMail, IconMenu, IconChevronDown } from './Icons';

export default function Topbar({ onMenu }: { onMenu?: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur-xl sm:px-8">
      <button
        onClick={onMenu}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-black/[0.05] lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <IconMenu />
      </button>

      {/* Recherche */}
      <div className="relative hidden max-w-sm flex-1 sm:block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <IconSearch width={18} height={18} />
        </span>
        <input
          className="w-full rounded-lg border border-transparent bg-black/[0.04] py-2 pl-10 pr-3 text-sm outline-none transition-all placeholder:text-muted/70 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
          placeholder="Rechercher…"
        />
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
        <button
          className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-black/[0.05] hover:text-ink"
          aria-label="Messages"
        >
          <IconMail width={19} height={19} />
        </button>
        <button
          className="relative grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-black/[0.05] hover:text-ink"
          aria-label="Notifications"
        >
          <IconBell width={19} height={19} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-ink ring-2 ring-surface" />
        </button>

        <div className="mx-1.5 hidden h-6 w-px bg-line sm:block" />

        <button className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-1.5 transition hover:bg-black/[0.04]">
          <Avatar initials={currentUser.initials} color={currentUser.avatarColor} size={34} />
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold leading-tight text-ink">
              {currentUser.name}
            </span>
            <span className="block text-xs text-muted">{currentUser.handle}</span>
          </span>
          <span className="hidden text-muted sm:block">
            <IconChevronDown width={15} height={15} />
          </span>
        </button>
      </div>
    </header>
  );
}
