'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconShield,
  IconBook,
  IconLive,
  IconUsers,
  IconChat,
  IconMail,
  IconMegaphone,
  IconCalendar,
  IconCard,
  IconSparkle,
  IconWand,
  IconArrowRight,
} from './Icons';

const items = [
  { href: '/admin', label: "Vue d'ensemble", Icon: IconShield, exact: true },
  { href: '/admin/cours', label: 'Cours', Icon: IconBook },
  { href: '/admin/live', label: 'Live', Icon: IconLive },
  { href: '/admin/messages', label: 'Messages', Icon: IconMail },
  { href: '/admin/messagerie', label: 'Messagerie', Icon: IconMegaphone },
  { href: '/admin/suivi', label: 'Suivi', Icon: IconCalendar },
  { href: '/admin/super-coach', label: 'Super Coach', Icon: IconSparkle },
  { href: '/admin/post-maker', label: 'AI Post Maker', Icon: IconWand },
  { href: '/admin/communaute', label: 'Communauté', Icon: IconChat },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', Icon: IconUsers },
];

// Visible uniquement pour le super admin (compte fondateur)
const superAdminItem: (typeof items)[number] = {
  href: '/admin/paiements',
  label: 'Accès super admin',
  Icon: IconCard,
};

export default function AdminNav({
  messagesUnread = 0,
  suiviUnread = 0,
  superAdmin = false,
}: {
  messagesUnread?: number;
  suiviUnread?: number;
  superAdmin?: boolean;
}) {
  const pathname = usePathname();
  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
  const badgeFor = (href: string) =>
    href === '/admin/messages' ? messagesUnread : href === '/admin/suivi' ? suiviUnread : 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav className="flex flex-wrap gap-1">
        {[...items, ...(superAdmin ? [superAdminItem] : [])].map((it) => {
          const on = active(it.href, it.exact);
          const badge = badgeFor(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                on ? 'bg-ink text-white' : 'text-muted hover:bg-black/[0.05] hover:text-ink'
              }`}
            >
              <it.Icon width={17} height={17} />
              {it.label}
              {badge > 0 && (
                <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
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
