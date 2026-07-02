'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconShield, IconBook, IconLive, IconUsers, IconChat, IconClipboard, IconMail, IconArrowRight } from './Icons';

const items = [
  { href: '/admin', label: "Vue d'ensemble", Icon: IconShield, exact: true },
  { href: '/admin/cours', label: 'Cours', Icon: IconBook },
  { href: '/admin/devoirs', label: 'Devoirs', Icon: IconClipboard },
  { href: '/admin/live', label: 'Live', Icon: IconLive },
  { href: '/admin/messages', label: 'Messages', Icon: IconMail },
  { href: '/admin/communaute', label: 'Communauté', Icon: IconChat },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', Icon: IconUsers },
];

export default function AdminNav() {
  const pathname = usePathname();
  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <nav className="scrollbar-hide flex gap-1 overflow-x-auto">
        {items.map((it) => {
          const on = active(it.href, it.exact);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                on ? 'bg-ink text-white' : 'text-muted hover:bg-black/[0.05] hover:text-ink'
              }`}
            >
              <it.Icon width={17} height={17} />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/tableau-de-bord"
        className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted transition hover:bg-black/[0.05] hover:text-ink sm:flex"
      >
        Retour à l&apos;app
        <IconArrowRight width={16} height={16} />
      </Link>
    </div>
  );
}
