import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/UI';
import { IconBook, IconLive, IconUsers, IconClipboard, IconArrowRight } from '@/components/Icons';

export const dynamic = 'force-dynamic';

async function count(table: string) {
  const supabase = createClient();
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
  return count ?? 0;
}

export default async function AdminHome() {
  const [courses, lives, users, posts] = await Promise.all([
    count('courses'),
    count('live_sessions'),
    count('profiles'),
    count('community_posts'),
  ]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Espace administrateur</h1>
        <p className="mt-1 text-sm text-muted">
          Gérez les cours, les sessions live et les membres de la plateforme.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Cours publiés" value={String(courses)} Icon={IconBook} />
        <StatCard label="Sessions live" value={String(lives)} Icon={IconLive} />
        <StatCard label="Membres" value={String(users)} Icon={IconUsers} />
        <StatCard label="Publications" value={String(posts)} Icon={IconClipboard} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { href: '/admin/cours', title: 'Gérer les cours', text: 'Ajouter, modifier ou retirer des cours.', Icon: IconBook },
          { href: '/admin/live', title: 'Gérer le live', text: 'Programmer les coachings de groupe.', Icon: IconLive },
          { href: '/admin/utilisateurs', title: 'Gérer les membres', text: 'Voir les membres et attribuer les rôles admin.', Icon: IconUsers },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="card group p-5 transition hover:shadow-soft">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-black/[0.04] text-ink">
              <c.Icon width={20} height={20} />
            </span>
            <p className="mt-3 flex items-center gap-1 font-bold text-ink">
              {c.title}
              <IconArrowRight width={16} height={16} className="opacity-0 transition group-hover:opacity-100" />
            </p>
            <p className="mt-1 text-sm text-muted">{c.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
