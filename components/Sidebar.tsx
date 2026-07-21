'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Logo from './Logo';
import {
  IconDashboard,
  IconBook,
  IconLive,
  IconTarget,
  IconTrend,
  IconCalendar,
  IconUsers,
  IconSettings,
  IconHelp,
  IconShield,
  IconSparkle,
  IconWand,
  IconX,
  IconLogout,
} from './Icons';

type MenuItem = { href: string; label: string; Icon: typeof IconBook; accent?: boolean };

const mainMenu: MenuItem[] = [
  { href: '/tableau-de-bord', label: 'Tableau de bord', Icon: IconDashboard },
  { href: '/mes-formations', label: 'Mes cours à suivre', Icon: IconBook },
  { href: '/live', label: 'Live & Replay', Icon: IconLive },
  { href: '/objectif', label: 'Objectif', Icon: IconTarget },
  // { href: '/catalogue', label: 'Catalogue', Icon: IconCompass }, // masqué temporairement — à réactiver plus tard
  { href: '/suivi', label: 'Suivi hebdomadaire', Icon: IconCalendar },
  { href: '/super-coach', label: 'Super Coach Roméo', Icon: IconSparkle },
  { href: '/ai-post-maker', label: 'AI Post Maker', Icon: IconWand, accent: true },
  { href: '/communaute', label: 'Communauté', Icon: IconUsers },
  { href: '/coaching', label: 'Coaching avec Roméo', Icon: IconTrend },
];

const settingMenu = [
  { href: '/parametres', label: 'Paramètres', Icon: IconSettings },
  { href: '/aide', label: 'Aide', Icon: IconHelp },
];

export default function Sidebar({
  open = false,
  onClose,
  isAdmin = false,
  contactUnread = 0,
  suiviUnread = 0,
  communauteUnread = 0,
}: {
  open?: boolean;
  onClose?: () => void;
  isAdmin?: boolean;
  contactUnread?: number;
  suiviUnread?: number;
  communauteUnread?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/connexion');
    router.refresh();
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const Item = ({ href, label, Icon, accent }: MenuItem) => {
    const active = isActive(href);
    const rawBadge =
      href === '/suivi' ? suiviUnread : href === '/communaute' ? communauteUnread : 0;
    // On masque la pastille sur l'onglet où l'on se trouve (déjà en lecture).
    const badge = active ? 0 : rawBadge;
    return (
      <Link
        href={href}
        onClick={onClose}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          accent && active
            ? 'bg-orange-50 text-orange-700'
            : active
            ? 'bg-black/[0.06] text-ink'
            : 'text-muted hover:bg-black/[0.04] hover:text-ink'
        }`}
      >
        <span className={accent ? 'text-orange-500' : active ? 'text-ink' : 'text-muted group-hover:text-ink'}>
          <Icon width={19} height={19} />
        </span>
        <span className="flex-1">{label}</span>
        {accent && (
          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-700">
            IA
          </span>
        )}
        {badge > 0 && (
          <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-line bg-[#f7f7f5] transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[72px] items-center justify-between px-5">
          <Link href="/tableau-de-bord" onClick={onClose}>
            <Logo />
          </Link>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-black/[0.05] lg:hidden"
            aria-label="Fermer le menu"
          >
            <IconX />
          </button>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto px-3.5 pb-4">
          <p className="px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-wider text-muted/70">
            Menu principal
          </p>
          <div className="flex flex-col gap-1">
            {mainMenu.map((m) => (
              <Item key={m.href} {...m} />
            ))}
          </div>

          <p className="px-3 pb-2 pt-6 text-[11px] font-bold uppercase tracking-wider text-muted/70">
            Réglages
          </p>
          <div className="flex flex-col gap-1">
            {settingMenu.map((m) => (
              <Item key={m.href} {...m} />
            ))}
          </div>

          {isAdmin && (
            <>
              <p className="px-3 pb-2 pt-6 text-[11px] font-bold uppercase tracking-wider text-muted/70">
                Administration
              </p>
              <div className="flex flex-col gap-1">
                <Item href="/admin" label="Espace admin" Icon={IconShield} />
              </div>
            </>
          )}

          {/* Bas de la sidebar : aide + déconnexion.
              mt-auto = collé en bas quand il reste de la place (desktop),
              suit le défilement quand le menu est long (mobile) — jamais flottant. */}
          <div className="mt-auto pt-6">
            <div className="rounded-xl border border-line bg-white p-3.5">
              <p className="text-sm font-semibold text-ink">Besoin d&apos;aide sur un sujet en particulier ?</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Écrivez directement à vos coachs, ils vous répondent.
              </p>
              <Link
                href="/contact"
                onClick={onClose}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-ink py-2 text-center text-xs font-semibold text-white transition hover:bg-black"
              >
                Contacter les coachs
                {contactUnread > 0 && (
                  <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {contactUnread > 9 ? '9+' : contactUnread}
                  </span>
                )}
              </Link>
            </div>

            <button
              onClick={handleLogout}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-black/[0.04] hover:text-ink"
            >
              <IconLogout width={19} height={19} />
              Déconnexion
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}
