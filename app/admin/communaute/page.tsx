import { createClient } from '@/lib/supabase/server';
import { deletePost, unflagPost } from '@/lib/admin-actions';
import Avatar from '@/components/Avatar';
import RichText from '@/components/RichText';
import { Badge } from '@/components/UI';
import { IconX, IconChat } from '@/components/Icons';

export const dynamic = 'force-dynamic';

const CHANNEL_LABEL: Record<string, string> = {
  annonces: 'Annonces',
  membres: 'Publications des membres',
  victoires: 'Vos victoires du jour',
  challenge: 'Challenge',
  ressources: 'Ressources',
  temoignages: 'Résultats et témoignages',
};

type Post = {
  id: string;
  author_name: string | null;
  author_avatar: string | null;
  channel: string;
  body: string | null;
  media_url: string | null;
  media_type: string | null;
  flagged?: boolean;
  flag_reason?: string | null;
  community_comments?: { count: number }[];
  community_likes?: { count: number }[];
};

function initials(name: string | null) {
  return (name || 'M').split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function PostRow({ p, flagged }: { p: Post; flagged?: boolean }) {
  return (
    <div className={`card p-4 ${flagged ? 'border-amber-300 bg-amber-50/40' : ''}`}>
      <div className="flex items-start gap-3">
        <Avatar initials={initials(p.author_name)} src={p.author_avatar} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{p.author_name || 'Membre'}</p>
            <Badge>{CHANNEL_LABEL[p.channel] ?? p.channel}</Badge>
            {flagged && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                🚩 {p.flag_reason || 'Signalé'}
              </span>
            )}
          </div>
          {p.body && (
            <p className="mt-1 whitespace-pre-line text-sm text-ink">
              <RichText text={p.body} />
            </p>
          )}
          {p.media_url && (
            <p className="mt-1 text-xs text-muted">
              {p.media_type === 'video' ? '🎬 Vidéo jointe' : p.media_type === 'pdf' ? '📄 PDF joint' : '🖼️ Image jointe'}
            </p>
          )}
          <p className="mt-1 flex items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <IconChat width={12} height={12} /> {p.community_comments?.[0]?.count ?? 0}
            </span>
            <span>{p.community_likes?.[0]?.count ?? 0} j&apos;aime</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {flagged && (
            <form action={unflagPost.bind(null, p.id)}>
              <button
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-black/[0.03]"
                title="Rétablir : la publication réapparaîtra dans le fil"
              >
                Rétablir
              </button>
            </form>
          )}
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
    </div>
  );
}

export default async function AdminCommunautePage() {
  const supabase = createClient();
  const { data: posts } = await supabase
    .from('community_posts')
    .select('*, community_comments(count), community_likes(count)')
    .order('created_at', { ascending: false })
    .limit(200);

  const all = (posts ?? []) as Post[];
  const flagged = all.filter((p) => p.flagged);
  const normal = all.filter((p) => !p.flagged);

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-ink">Modération de la communauté</h1>
      <p className="mb-4 text-sm text-muted">
        Les publications qui réclament un remboursement ou expriment un mécontentement sont{' '}
        <b className="text-ink">automatiquement signalées et masquées du fil</b>. Retrouve-les ci-dessous&nbsp;:
        « Rétablir » les republie, la croix les supprime.
      </p>

      {/* Section : publications signalées automatiquement */}
      <section className="mb-8">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
          🚩 Signalés automatiquement
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            {flagged.length}
          </span>
        </h2>
        {flagged.length ? (
          <div className="space-y-3">
            {flagged.map((p) => (
              <PostRow key={p.id} p={p} flagged />
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-sm text-muted">
            Aucune publication signalée pour le moment.
          </div>
        )}
      </section>

      {/* Section : publications visibles dans le fil */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-ink">Publications visibles ({normal.length})</h2>
        {normal.length ? (
          <div className="space-y-3">
            {normal.map((p) => (
              <PostRow key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-muted">Aucune publication pour le moment.</div>
        )}
      </section>
    </>
  );
}
