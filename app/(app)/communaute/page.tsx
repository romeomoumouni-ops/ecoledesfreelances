export const dynamic = 'force-dynamic';

import { PageHeader, Badge, EmptyState } from '@/components/UI';
import Avatar from '@/components/Avatar';
import { getCommunityPosts } from '@/lib/db';
import { getCurrentProfile, profileInitials } from '@/lib/user';
import { IconHeart, IconChat, IconStar, IconPlus, IconLock } from '@/components/Icons';

const channels = [
  { name: 'Annonces', adminOnly: true },
  { name: 'Publications régulières', active: true },
  { name: 'Vos victoires du jour' },
] as { name: string; active?: boolean; adminOnly?: boolean }[];

export default async function CommunautePage() {
  const [posts, profile] = await Promise.all([getCommunityPosts(), getCurrentProfile()]);

  return (
    <>
      <PageHeader
        title="Communauté"
        subtitle="Échangez avec les autres élèves, posez vos questions et partagez vos réussites."
      >
        <button className="btn-primary">
          <IconPlus width={18} height={18} /> Publier
        </button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Canaux */}
        <aside>
          <div className="card p-3">
            <p className="mb-1 px-2 pt-1 text-xs font-bold uppercase tracking-wide text-muted">
              Canaux
            </p>
            <div className="space-y-1">
              {channels.map((c) => (
                <button
                  key={c.name}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    c.active ? 'bg-black/[0.06] text-ink' : 'text-muted hover:bg-black/[0.04] hover:text-ink'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-ink/30" />
                  <span className="flex-1 text-left">{c.name}</span>
                  {c.adminOnly && (
                    <span title="Réservé aux administrateurs" className="text-muted">
                      <IconLock width={14} height={14} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Fil */}
        <div className="space-y-4">
          {/* Zone de saisie */}
          <div className="card flex items-center gap-3 p-4">
            <Avatar
              initials={profile ? profileInitials(profile) : 'M'}
              src={profile?.avatar_url}
              size={40}
            />
            <button className="flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-left text-sm text-muted transition hover:border-[#dcdcda]">
              Partagez quelque chose avec la communauté…
            </button>
          </div>

          {posts.length ? (
            posts.map((p) => (
              <div key={p.id} className="card p-5">
                <div className="flex items-center gap-3">
                  <Avatar initials={p.author.split(' ').map((n) => n[0]).join('')} size={44} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-ink">{p.author}</p>
                      <Badge>{p.role}</Badge>
                      {p.pinned && <Badge variant="outline">Épinglé</Badge>}
                    </div>
                    <p className="text-xs text-muted">{p.time}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink">{p.text}</p>
                <div className="mt-4 flex items-center gap-5 border-t border-line pt-3 text-sm font-semibold text-muted">
                  <button className="flex items-center gap-1.5 transition hover:text-ink">
                    <IconHeart width={18} height={18} /> {p.likes}
                  </button>
                  <button className="flex items-center gap-1.5 transition hover:text-ink">
                    <IconChat width={18} height={18} /> {p.comments}
                  </button>
                  <button className="ml-auto flex items-center gap-1.5 transition hover:text-ink">
                    <IconStar width={18} height={18} /> Enregistrer
                  </button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              Icon={IconChat}
              title="Aucune publication pour l'instant"
              text="Soyez le premier à lancer la conversation dans la communauté."
            />
          )}
        </div>
      </div>
    </>
  );
}
