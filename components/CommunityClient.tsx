'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { uploadResumable } from '@/lib/uploadResumable';
import { PageHeader } from '@/components/UI';
import Avatar from '@/components/Avatar';
import { IconHeart, IconChat, IconLock, IconX, IconCamera } from '@/components/Icons';

const supabase = createClient();

type Me = { id: string; name: string; isAdmin: boolean; avatarUrl: string | null };

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

const CHANNELS = [
  { key: 'annonces', label: 'Annonces', adminOnly: true },
  { key: 'membres', label: 'Publications des membres' },
  { key: 'victoires', label: 'Vos victoires du jour' },
];

function initialsOf(name: string | null) {
  return (name || 'M').split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

export default function CommunityClient({ me }: { me: Me }) {
  const [channel, setChannel] = useState('membres');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const canPost = channel !== 'annonces' || me.isAdmin;

  async function loadFeed(ch: string) {
    setLoading(true);
    const { data } = await supabase
      .from('community_posts')
      .select('*, community_likes(count), community_comments(count)')
      .eq('channel', ch)
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
    loadFeed(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

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
      <PageHeader title="Communauté" subtitle="Partagez, échangez et progressez ensemble." />

      {err && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      {/* Canaux */}
      <div className="scrollbar-hide mb-5 flex gap-2 overflow-x-auto pb-1">
        {CHANNELS.map((c) => {
          const active = channel === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setChannel(c.key)}
              className={`chip shrink-0 gap-2 px-4 py-2.5 text-sm transition ${
                active ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:bg-black/[0.03] hover:text-ink'
              }`}
            >
              {c.label}
              {c.adminOnly && <IconLock width={13} height={13} />}
            </button>
          );
        })}
      </div>

      {/* Composer */}
      {canPost ? (
        <Composer
          me={me}
          channel={channel}
          onPosted={(p) => setPosts((ps) => [p, ...ps])}
          onError={setErr}
        />
      ) : (
        <div className="card mb-5 flex items-center gap-2 p-4 text-sm text-muted">
          <IconLock width={16} height={16} /> Seuls les administrateurs peuvent publier des annonces.
        </div>
      )}

      {/* Fil */}
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
          Aucune publication ici pour l&apos;instant.
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
  onPosted,
  onError,
}: {
  me: Me;
  channel: string;
  onPosted: (p: Post) => void;
  onError: (m: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ url: string; type: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? { url: URL.createObjectURL(f), type: f.type.startsWith('video') ? 'video' : 'image' } : null);
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
        media_type = file.type.startsWith('video') ? 'video' : 'image';
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
      <div className="flex items-start gap-3">
        <Avatar initials={initialsOf(me.name)} src={me.avatarUrl} size={40} />
        <div className="flex-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="input min-h-[70px] resize-none"
            placeholder={channel === 'victoires' ? 'Partage ta victoire du jour…' : 'Quoi de neuf ?'}
          />
          {preview && (
            <div className="relative mt-3 overflow-hidden rounded-lg border border-line">
              {preview.type === 'video' ? (
                <video src={preview.url} controls className="max-h-72 w-full bg-ink" />
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
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-outline"
              disabled={busy}
            >
              <IconCamera width={18} height={18} /> Photo / Vidéo
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={pick} />
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
  me: Me;
  onLike: () => void;
  onDelete: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const canDelete = post.user_id === me.id || me.isAdmin;

  return (
    <div className="card p-5">
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

      {post.body && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">{post.body}</p>}

      {post.media_url && (
        <div className="mt-3 overflow-hidden rounded-lg border border-line">
          {post.media_type === 'video' ? (
            <video src={post.media_url} controls className="max-h-[70vh] w-full bg-ink" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.media_url} alt="" className="w-full object-cover" />
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-5 border-t border-line pt-3 text-sm font-semibold text-muted">
        <button onClick={onLike} className={`flex items-center gap-1.5 transition hover:text-ink ${post.likedByMe ? 'text-ink' : ''}`}>
          <IconHeart width={18} height={18} /> {post.likeCount}
        </button>
        <button onClick={() => setShowComments((v) => !v)} className="flex items-center gap-1.5 transition hover:text-ink">
          <IconChat width={18} height={18} /> {post.commentCount}
        </button>
      </div>

      {showComments && <PostComments postId={post.id} me={me} />}
    </div>
  );
}

/* ---------- Commentaires d'une publication ---------- */
type PostComment = { id: string; author_name: string | null; body: string; user_id: string; created_at: string };

function PostComments({ postId, me }: { postId: string; me: Me }) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from('community_comments')
      .select('id, author_name, body, user_id, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (active) {
          setComments(data ?? []);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [postId]);

  async function add() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const { data, error } = await supabase
      .from('community_comments')
      .insert({ post_id: postId, user_id: me.id, author_name: me.name, body: text })
      .select('id, author_name, body, user_id, created_at')
      .single();
    if (!error && data) {
      setComments((c) => [...c, data]);
      setBody('');
    }
    setBusy(false);
  }

  async function del(id: string) {
    setComments((c) => c.filter((x) => x.id !== id));
    await supabase.from('community_comments').delete().eq('id', id);
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex items-start gap-2">
        <Avatar initials={initialsOf(me.name)} src={me.avatarUrl} size={32} />
        <div className="flex-1">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            className="input"
            placeholder="Écrire un commentaire…"
          />
        </div>
        <button onClick={add} disabled={busy || !body.trim()} className="btn-primary disabled:opacity-60">
          Envoyer
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {loading ? (
          <p className="text-xs text-muted">Chargement…</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar initials={initialsOf(c.author_name)} size={30} />
              <div className="flex-1 rounded-lg bg-black/[0.03] px-3 py-2">
                <p className="text-xs font-semibold text-ink">{c.author_name || 'Membre'}</p>
                <p className="text-sm text-ink">{c.body}</p>
              </div>
              {(c.user_id === me.id || me.isAdmin) && (
                <button onClick={() => del(c.id)} className="mt-1 text-muted hover:text-red-600" aria-label="Supprimer">
                  <IconX width={14} height={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
