'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Logo from './Logo';
import {
  IconDashboard,
  IconBook,
  IconLive,
  IconClipboard,
  IconTarget,
  IconUsers,
  IconSettings,
  IconHelp,
  IconShield,
  IconX,
  IconLogout,
} from './Icons';

const mainMenu = [
  { href: '/tableau-de-bord', label: 'Tableau de bord', Icon: IconDashboard },
  { href: '/mes-formations', label: 'Mes cours à suivre', Icon: IconBook },
  { href: '/live', label: 'Live', Icon: IconLive },
  { href: '/objectif', label: 'Objectif', Icon: IconTarget },
  // { href: '/catalogue', label: 'Catalogue', Icon: IconCompass }, // masqué temporairement — à réactiver plus tard
  { href: '/devoirs', label: 'Devoirs', Icon: IconClipboard },
  { href: '/communaute', label: 'Communauté', Icon: IconUsers },
];

const settingMenu = [
  { href: '/parametres', label: 'Paramètres', Icon: IconSettings },
  { href: '/aide', label: 'Aide', Icon: IconHelp },
];

export default function Sidebar({
  open = false,
  onClose,
  isAdmin = false,
}: {
  open?: boolean;
  onClose?: () => void;
  isAdmin?: boolean;
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

  const Item = ({ href, label, Icon }: { href: string; label: string; Icon: typeof IconBook }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        onClick={onClose}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? 'bg-black/[0.06] text-ink'
            : 'text-muted hover:bg-black/[0.04] hover:text-ink'
        }`}
      >
        <span className={active ? 'text-ink' : 'text-muted group-hover:text-ink'}>
          <Icon width={19} height={19} />
        </span>
        {label}
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

        <nav className="flex-1 overflow-y-auto px-3.5 pb-4">
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
        </nav>

        {/* Carte coach / aide */}
        <div className="mx-3 mb-2 rounded-xl border border-line bg-white p-3.5">
          <p className="text-sm font-semibold text-ink">Besoin d&apos;aide ?</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Votre coach et la communauté répondent à vos questions.
          </p>
          <Link
            href="/aide"
            className="mt-3 block w-full rounded-lg bg-ink py-2 text-center text-xs font-semibold text-white transition hover:bg-black"
          >
            Contacter
          </Link>
        </div>

        <button
          onClick={handleLogout}
          className="mx-3 mb-3 flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-black/[0.04] hover:text-ink"
        >
          <IconLogout width={19} height={19} />
          Déconnexion
        </button>
      </aside>
    </>
  );
}
