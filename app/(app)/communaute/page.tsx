export const dynamic = 'force-dynamic';

import { PageHeader, Badge } from '@/components/UI';
import Avatar from '@/components/Avatar';
import { currentUser } from '@/lib/data';
import { getCommunityPosts } from '@/lib/db';
import {
  IconHeart,
  IconChat,
  IconUsers,
  IconStar,
  IconPlus,
  IconLock,
} from '@/components/Icons';

const channels = [
  { name: 'Annonces', count: 12, color: '#3b82f6', adminOnly: true },
  { name: 'Publications régulières', count: 64, color: '#3f9af6', active: true },
  { name: 'Vos victoires du jour', count: 27, color: '#23b58a' },
] as { name: string; count: number; color: string; active?: boolean; adminOnly?: boolean }[];

export default async function CommunautePage() {
  const communityPosts = await getCommunityPosts();
  return (
    <>
      <PageHeader
        title="Communauté"
        subtitle="Échangez avec les autres élèves, posez vos questions et partagez vos réussites."
      >
        <button className="btn-primary">
          <IconPlus width={18} height={18} /> Nouvelle publication
        </button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Canaux */}
        <aside className="space-y-4">
          <div className="card p-4">
            <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-muted">
              Canaux
            </p>
            <div className="space-y-1">
              {channels.map((c) => (
                <button
                  key={c.name}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-semibold transition ${
                    c.active ? 'bg-black/[0.04] text-ink' : 'text-muted hover:bg-black/[0.04] hover:text-ink'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-ink/30" />
                  <span className="flex-1 text-left">{c.name}</span>
                  {c.adminOnly ? (
                    <span title="Réservé aux administrateurs" className="text-muted">
                      <IconLock width={14} height={14} />
                    </span>
                  ) : (
                    <span className="text-xs text-muted">{c.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-black/[0.04] text-ink">
              <IconUsers width={24} height={24} />
            </span>
            <p className="mt-3 text-2xl font-bold text-ink">3 240</p>
            <p className="text-sm text-muted">membres actifs</p>
          </div>
        </aside>

        {/* Fil */}
        <div className="space-y-4">
          {/* Zone de saisie */}
          <div className="card flex items-center gap-3 p-4">
            <Avatar initials={currentUser.initials} color={currentUser.avatarColor} size={42} />
            <button className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-left text-sm text-muted transition hover:border-[#dcdcda]">
              Partagez quelque chose avec la communauté...
            </button>
          </div>

          {communityPosts.map((p) => (
            <div key={p.id} className="card p-5">
              <div className="flex items-center gap-3">
                <Avatar initials={p.author.split(' ').map((n) => n[0]).join('')} size={44} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-ink">{p.author}</p>
                    <Badge color={p.role === 'Formatrice' ? '#3b82f6' : '#23b58a'}>
                      {p.role}
                    </Badge>
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
          ))}
        </div>
      </div>
    </>
  );
}