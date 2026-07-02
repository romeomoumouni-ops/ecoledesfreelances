import { createClient } from '@/lib/supabase/server';
import { deletePost } from '@/lib/admin-actions';
import Avatar from '@/components/Avatar';
import { Badge } from '@/components/UI';
import { IconX, IconChat } from '@/components/Icons';

export const dynamic = 'force-dynamic';

const CHANNEL_LABEL: Record<string, string> = {
  annonces: 'Annonces',
  membres: 'Publications des membres',
  victoires: 'Vos victoires du jour',
};

function initials(name: string | null) {
  return (name || 'M').split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default async function AdminCommunautePage() {
  const supabase = createClient();
  const { data: posts } = await supabase
    .from('community_posts')
    .select('*, community_comments(count), community_likes(count)')
    .order('created_at', { ascending: false })
    .limit(100);

  const list = posts ?? [];

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-ink">Modération de la communauté</h1>
      <p className="mb-4 text-sm text-muted">
        {list.length} publication(s). Supprimez toute publication inappropriée (l&apos;action retire aussi ses commentaires).
      </p>

      {list.length ? (
        <div className="space-y-3">
          {list.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start gap-3">
                <Avatar initials={initials(p.author_name)} src={p.author_avatar} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{p.author_name || 'Membre'}</p>
                    <Badge>{CHANNEL_LABEL[p.channel] ?? p.channel}</Badge>
                  </div>
                  {p.body && <p className="mt-1 whitespace-pre-line text-sm text-ink">{p.body}</p>}
                  {p.media_url && (
                    <p className="mt-1 text-xs text-muted">
                      {p.media_type === 'video' ? '🎬 Vidéo jointe' : '🖼️ Image jointe'}
                    </p>
                  )}
                  <p className="mt-1 flex items-center gap-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <IconChat width={12} height={12} /> {p.community_comments?.[0]?.count ?? 0}
                    </span>
                    <span>{p.community_likes?.[0]?.count ?? 0} j&apos;aime</span>
                  </p>
                </div>
                <form action={deletePost.bind(null, p.id)}>
                  <button
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Supprimer"
                    title="Supprimer la publication"
                  >
                    <IconX width={18} height={18} />
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center text-sm text-muted">Aucune publication pour le moment.</div>
      )}
    </>
  );
}
