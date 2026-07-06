'use client';

// Fil de publications réutilisable (communauté, témoignages…) :
// composer texte + photo/vidéo (upload résumable avec progression), likes,
// commentaires, temps réel, suppression (auteur ou admin).

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import { uploadResumable } from '@/lib/uploadResumable';
import UploadLeaveGuard from '@/components/UploadLeaveGuard';
import Avatar from '@/components/Avatar';
import RichText from '@/components/RichText';
import RichTextArea from '@/components/RichTextArea';
import { IconHeart, IconChat, IconX, IconCamera, IconFile } from '@/components/Icons';

const supabase = createClient();

export type FeedUser = { id: string; name: string; isAdmin: boolean; avatarUrl: string | null };

type Post = {
  id: string;
  user_id: string;
  channel: string;
  body: string | null;
  media_url: string | null;
  media_type: string | null;
  author_name: string | null;
  author_avatar: string | null;
  created_at: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

function initialsOf(name: string | null) {
  return (name || 'M').split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

/* Bouton J'aime : cœur qui se remplit en rouge + battement + petit cœur qui s'envole */
function LikeButton({
  liked,
  count,
  size = 18,
  zeroLabel,
  onToggle,
}: {
  liked: boolean;
  count: number;
  size?: number;
  zeroLabel?: string;
  onToggle: () => void;
}) {
  const [burst, setBurst] = useState(0);
  function click() {
    if (!liked) setBurst((n) => n + 1); // on ne fait s'envoler le cœur que quand on aime
    onToggle();
  }
  return (
    <button
      onClick={click}
      className={`flex items-center gap-1.5 transition hover:text-red-500 ${liked ? 'text-red-500' : ''}`}
    >
      <span className="relative inline-flex">
        <IconHeart
          key={liked ? 'on' : 'off'}
          width={size}
          height={size}
          fill={liked ? 'currentColor' : 'none'}
          className={liked ? 'heart-pop' : ''}
        />
        {burst > 0 && (
          <span key={burst} className="heart-float pointer-events-none absolute left-1/2 top-0 text-red-500">
            <IconHeart width={size} height={size} fill="currentColor" />
          </span>
        )}
      </span>
      {count > 0 ? count : zeroLabel ?? 0}
    </button>
  );
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

export default function Feed({
  me,
  channel,
  canPost = true,
  placeholder = 'Quoi de neuf ?',
  emptyText = "Aucune publication ici pour l'instant.",
}: {
  me: FeedUser;
  channel: string;
  canPost?: boolean;
  placeholder?: string;
  emptyText?: string;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function loadFeed() {
    setLoading(true);
    const { data } = await supabase
      .from('community_posts')
      .select('*, community_likes(count), community_comments(count)')
      .eq('channel', channel)
      .order('created_at', { ascending: false });
    const rows = data ?? [];
    let liked = new Set<string>();
    const ids = rows.map((r: { id: string }) => r.id);
    if (ids.length) {
      const { data: myl } = await supabase
        .from('community_likes')
        .select('post_id')
        .eq('user_id', me.id)
        .in('post_id', ids);
      liked = new Set((myl ?? []).map((r: { post_id: string }) => r.post_id));
    }
    setPosts(
      rows.map((p: Record<string, unknown> & { id: string }) => ({
        ...(p as unknown as Post),
        likeCount: (p.community_likes as { count: number }[])?.[0]?.count ?? 0,
        commentCount: (p.community_comments as { count: number }[])?.[0]?.count ?? 0,
        likedByMe: liked.has(p.id),
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  // Temps réel : posts, likes et commentaires des autres apparaissent sans recharger
  useEffect(() => {
    void ensureRealtimeAuth();
    const ch = supabase
      .channel(`feed-${channel}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_posts', filter: `channel=eq.${channel}` },
        (payload) => {
          const p = payload.new as Post;
          setPosts((prev) =>
            prev.some((x) => x.id === p.id)
              ? prev
              : [{ ...p, likeCount: 0, commentCount: 0, likedByMe: false }, ...prev]
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_posts' },
        (payload) => {
          const id = (payload.old as { id: string }).id;
          setPosts((prev) => prev.filter((p) => p.id !== id));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_comments' },
        (payload) => {
          const c = payload.new as { post_id: string };
          setPosts((prev) =>
            prev.map((p) => (p.id === c.post_id ? { ...p, commentCount: p.commentCount + 1 } : p))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_likes' },
        (payload) => {
          const l = payload.new as { post_id: string; user_id: string };
          if (l.user_id === me.id) return; // déjà compté en optimiste
          setPosts((prev) =>
            prev.map((p) => (p.id === l.post_id ? { ...p, likeCount: p.likeCount + 1 } : p))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_likes' },
        (payload) => {
          const l = payload.old as { post_id: string; user_id: string };
          if (l.user_id === me.id) return;
          setPosts((prev) =>
            prev.map((p) =>
              p.id === l.post_id ? { ...p, likeCount: Math.max(0, p.likeCount - 1) } : p
            )
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, me.id]);

  async function deletePost(id: string) {
    if (!confirm('Supprimer cette publication ?')) return;
    setPosts((ps) => ps.filter((p) => p.id !== id));
    await supabase.from('community_posts').delete().eq('id', id);
  }

  async function toggleLike(post: Post) {
    const liked = post.likedByMe;
    setPosts((ps) =>
      ps.map((p) =>
        p.id === post.id ? { ...p, likedByMe: !liked, likeCount: p.likeCount + (liked ? -1 : 1) } : p
      )
    );
    if (liked) {
      await supabase.from('community_likes').delete().eq('post_id', post.id).eq('user_id', me.id);
    } else {
      await supabase.from('community_likes').insert({ post_id: post.id, user_id: me.id });
    }
  }

  return (
    <>
      {err && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      {canPost && (
        <Composer
          me={me}
          channel={channel}
          placeholder={placeholder}
          onPosted={(p) => setPosts((ps) => (ps.some((x) => x.id === p.id) ? ps : [p, ...ps]))}
          onError={setErr}
        />
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-muted">Chargement…</p>
      ) : posts.length ? (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} me={me} onLike={() => toggleLike(p)} onDelete={() => deletePost(p.id)} />
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center text-sm text-muted">
          {emptyText}
          {canPost ? ' Sois le premier à publier !' : ''}
        </div>
      )}
    </>
  );
}

/* ---------- Composer ---------- */
function Composer({
  me,
  channel,
  placeholder,
  onPosted,
  onError,
}: {
  me: FeedUser;
  channel: string;
  placeholder: string;
  onPosted: (p: Post) => void;
  onError: (m: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ url: string; type: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  function mediaKind(f: File): 'video' | 'image' | 'pdf' {
    if (f.type.startsWith('video')) return 'video';
    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) return 'pdf';
    return 'image';
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? { url: URL.createObjectURL(f), type: mediaKind(f), name: f.name } : null);
  }

  async function publish() {
    if (!body.trim() && !file) return;
    setBusy(true);
    try {
      let media_url: string | null = null;
      let media_type: string | null = null;
      if (file) {
        const ext = file.name.split('.').pop() || 'bin';
        const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
        setProgress(0);
        await uploadResumable('community-media', path, file, setProgress);
        media_url = supabase.storage.from('community-media').getPublicUrl(path).data.publicUrl;
        media_type = mediaKind(file);
      }
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          user_id: me.id,
          channel,
          body: body.trim() || null,
          media_url,
          media_type,
          author_name: me.name,
          author_avatar: me.avatarUrl,
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      onPosted({ ...(data as Post), likeCount: 0, commentCount: 0, likedByMe: false });
      setBody('');
      setFile(null);
      setPreview(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Échec de la publication.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="card mb-5 p-4">
      <UploadLeaveGuard active={progress !== null} title="Envoi du fichier en cours" message="Ta pièce jointe n'a pas fini de se charger. Si tu quittes maintenant, ta publication ne sera pas envoyée." />
      <div className="flex items-start gap-3">
        <Avatar initials={initialsOf(me.name)} src={me.avatarUrl} size={40} />
        <div className="flex-1">
          <RichTextArea
            value={body}
            onChange={setBody}
            placeholder={placeholder}
            minHeightClass="min-h-[70px]"
          />
          {preview && (
            <div className="relative mt-3 overflow-hidden rounded-lg border border-line">
              {preview.type === 'video' ? (
                <video src={preview.url} controls className="max-h-72 w-full bg-ink" />
              ) : preview.type === 'pdf' ? (
                <div className="flex items-center gap-3 bg-black/[0.02] p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600">
                    <IconFile width={20} height={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{preview.name}</span>
                    <span className="block text-xs text-muted">Document PDF</span>
                  </span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt="" className="max-h-72 w-full object-cover" />
              )}
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"
                aria-label="Retirer"
              >
                <IconX width={16} height={16} />
              </button>
            </div>
          )}
          {progress !== null && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs font-medium text-muted">
                <span>Envoi du média…</span>
                <span className="text-ink">{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07]">
                <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-outline" disabled={busy}>
              <IconCamera width={18} height={18} /> Photo, vidéo ou PDF
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*,application/pdf" className="hidden" onChange={pick} />
            <button onClick={publish} disabled={busy || (!body.trim() && !file)} className="btn-primary disabled:opacity-60">
              {busy ? 'Publication…' : 'Publier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Carte de publication ---------- */
function PostCard({
  post,
  me,
  onLike,
  onDelete,
}: {
  post: Post;
  me: FeedUser;
  onLike: () => void;
  onDelete: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const canDelete = post.user_id === me.id || me.isAdmin;

  return (
    <div className="card p-5 transition-shadow duration-200 hover:shadow-[0_6px_24px_rgba(0,0,0,0.07)]">
      <div className="flex items-center gap-3">
        <Avatar initials={initialsOf(post.author_name)} src={post.author_avatar} size={42} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">{post.author_name || 'Membre'}</p>
          <p className="text-xs text-muted">{timeAgo(post.created_at)}</p>
        </div>
        {canDelete && (
          <button
            onClick={onDelete}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
            aria-label="Supprimer"
          >
            <IconX width={16} height={16} />
          </button>
        )}
      </div>

      {post.body && (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">
          <RichText text={post.body} />
        </p>
      )}

      {post.media_url && (
        <div className="mt-3 overflow-hidden rounded-lg border border-line">
          {post.media_type === 'video' ? (
            <video src={post.media_url} controls className="max-h-[70vh] w-full bg-ink" />
          ) : post.media_type === 'pdf' ? (
            <a
              href={post.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-black/[0.02] p-4 transition hover:bg-black/[0.04]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600">
                <IconFile width={20} height={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Document PDF</span>
                <span className="block text-xs text-muted">Appuie pour ouvrir ou télécharger</span>
              </span>
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.media_url} alt="" className="w-full object-cover" />
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-5 border-t border-line pt-3 text-sm font-semibold text-muted">
        <LikeButton liked={post.likedByMe} count={post.likeCount} onToggle={onLike} />
        <button onClick={() => setShowComments((v) => !v)} className="flex items-center gap-1.5 transition hover:text-ink">
          <IconChat width={18} height={18} /> {post.commentCount}
        </button>
      </div>

      {showComments && <PostComments postId={post.id} me={me} />}
    </div>
  );
}

/* ---------- Commentaires d'une publication ---------- */
type PostComment = {
  id: string;
  parent_id: string | null;
  author_name: string | null;
  body: string;
  user_id: string;
  created_at: string;
  likeCount: number;
  likedByMe: boolean;
};

// Champ de saisie réutilisable (commentaire racine ou réponse)
function CommentInput({
  me,
  placeholder,
  autoFocus = false,
  small = false,
  onSubmit,
}: {
  me: FeedUser;
  placeholder: string;
  autoFocus?: boolean;
  small?: boolean;
  onSubmit: (text: string) => Promise<void>;
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    await onSubmit(text);
    setBody('');
    setBusy(false);
  }

  return (
    <div className="flex items-start gap-2">
      <Avatar initials={initialsOf(me.name)} src={me.avatarUrl} size={small ? 26 : 32} />
      <div className="flex-1">
        <input
          value={body}
          autoFocus={autoFocus}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          className="input"
          placeholder={placeholder}
        />
      </div>
      <button onClick={send} disabled={busy || !body.trim()} className="btn-primary disabled:opacity-60">
        Envoyer
      </button>
    </div>
  );
}

function PostComments({ postId, me }: { postId: string; me: FeedUser }) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('community_comments')
        .select('id, parent_id, author_name, body, user_id, created_at, community_comment_likes(count)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      const rows = data ?? [];
      let liked = new Set<string>();
      const ids = rows.map((r: { id: string }) => r.id);
      if (ids.length) {
        const { data: myl } = await supabase
          .from('community_comment_likes')
          .select('comment_id')
          .eq('user_id', me.id)
          .in('comment_id', ids);
        liked = new Set((myl ?? []).map((r: { comment_id: string }) => r.comment_id));
      }
      if (active) {
        setComments(
          rows.map((c: Record<string, unknown> & { id: string }) => ({
            ...(c as unknown as PostComment),
            likeCount: (c.community_comment_likes as { count: number }[])?.[0]?.count ?? 0,
            likedByMe: liked.has(c.id),
          }))
        );
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [postId, me.id]);

  // Temps réel : commentaires, réponses et likes des autres membres
  useEffect(() => {
    void ensureRealtimeAuth();
    const ch = supabase
      .channel(`comments-${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_comments', filter: `post_id=eq.${postId}` },
        (payload) => {
          const c = payload.new as PostComment;
          setComments((prev) =>
            prev.some((x) => x.id === c.id) ? prev : [...prev, { ...c, likeCount: 0, likedByMe: false }]
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_comments' },
        (payload) => {
          const id = (payload.old as { id: string }).id;
          setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_comment_likes' },
        (payload) => {
          const l = payload.new as { comment_id: string; user_id: string };
          if (l.user_id === me.id) return;
          setComments((prev) =>
            prev.map((c) => (c.id === l.comment_id ? { ...c, likeCount: c.likeCount + 1 } : c))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_comment_likes' },
        (payload) => {
          const l = payload.old as { comment_id: string; user_id: string };
          if (l.user_id === me.id) return;
          setComments((prev) =>
            prev.map((c) =>
              c.id === l.comment_id ? { ...c, likeCount: Math.max(0, c.likeCount - 1) } : c
            )
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [postId, me.id]);

  async function add(text: string, parentId: string | null) {
    const { data, error } = await supabase
      .from('community_comments')
      .insert({ post_id: postId, user_id: me.id, author_name: me.name, body: text, parent_id: parentId })
      .select('id, parent_id, author_name, body, user_id, created_at')
      .single();
    if (!error && data) {
      setComments((c) =>
        c.some((x) => x.id === data.id) ? c : [...c, { ...(data as PostComment), likeCount: 0, likedByMe: false }]
      );
      setReplyTo(null);
    }
  }

  async function del(id: string) {
    // On retire le commentaire et ses réponses (cascade en base)
    setComments((c) => c.filter((x) => x.id !== id && x.parent_id !== id));
    await supabase.from('community_comments').delete().eq('id', id);
  }

  async function toggleLike(c: PostComment) {
    const liked = c.likedByMe;
    setComments((list) =>
      list.map((x) =>
        x.id === c.id ? { ...x, likedByMe: !liked, likeCount: x.likeCount + (liked ? -1 : 1) } : x
      )
    );
    if (liked) {
      await supabase
        .from('community_comment_likes')
        .delete()
        .eq('comment_id', c.id)
        .eq('user_id', me.id);
    } else {
      await supabase.from('community_comment_likes').insert({ comment_id: c.id, user_id: me.id });
    }
  }

  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) =>
    comments
      .filter((c) => c.parent_id === id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="mt-4 border-t border-line pt-4">
      <CommentInput me={me} placeholder="Écrire un commentaire…" onSubmit={(t) => add(t, null)} />

      <div className="mt-4 space-y-4">
        {loading ? (
          <p className="text-xs text-muted">Chargement…</p>
        ) : (
          roots.map((c) => (
            <div key={c.id}>
              <CommentRow
                c={c}
                me={me}
                isReplying={replyTo === c.id}
                onLike={() => toggleLike(c)}
                onReply={() => setReplyTo((v) => (v === c.id ? null : c.id))}
                onDelete={() => del(c.id)}
              />

              {/* Réponses */}
              {(repliesOf(c.id).length > 0 || replyTo === c.id) && (
                <div className="ml-5 mt-3 space-y-3 border-l-2 border-line pl-3 sm:ml-8 sm:pl-4">
                  {repliesOf(c.id).map((r) => (
                    <CommentRow
                      key={r.id}
                      c={r}
                      me={me}
                      small
                      onLike={() => toggleLike(r)}
                      onDelete={() => del(r.id)}
                    />
                  ))}
                  {replyTo === c.id && (
                    <CommentInput
                      me={me}
                      small
                      autoFocus
                      placeholder={`Répondre à ${c.author_name || 'ce membre'}…`}
                      onSubmit={(t) => add(t, c.id)}
                    />
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------- Une ligne de commentaire (racine ou réponse) ---------- */
function CommentRow({
  c,
  me,
  small = false,
  isReplying = false,
  onLike,
  onReply,
  onDelete,
}: {
  c: PostComment;
  me: FeedUser;
  small?: boolean;
  isReplying?: boolean;
  onLike: () => void;
  onReply?: () => void;
  onDelete: () => void;
}) {
  const canDelete = c.user_id === me.id || me.isAdmin;
  return (
    <div className="flex items-start gap-2">
      <Avatar initials={initialsOf(c.author_name)} size={small ? 26 : 30} />
      <div className="min-w-0 flex-1">
        <div className="rounded-lg bg-black/[0.03] px-3 py-2">
          <p className="text-xs font-semibold text-ink">{c.author_name || 'Membre'}</p>
          <p className="whitespace-pre-line text-sm text-ink">
            <RichText text={c.body} />
          </p>
        </div>
        {/* Actions : like + répondre */}
        <div className="mt-1 flex items-center gap-4 pl-1 text-xs font-semibold text-muted">
          <LikeButton liked={c.likedByMe} count={c.likeCount} size={14} zeroLabel="J'aime" onToggle={onLike} />
          {onReply && (
            <button onClick={onReply} className={`transition hover:text-ink ${isReplying ? 'text-ink' : ''}`}>
              Répondre
            </button>
          )}
        </div>
      </div>
      {canDelete && (
        <button onClick={onDelete} className="mt-1 text-muted hover:text-red-600" aria-label="Supprimer">
          <IconX width={14} height={14} />
        </button>
      )}
    </div>
  );
}
