'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import { IconBell, IconMegaphone, IconHeart, IconChat } from '@/components/Icons';
import { EmptyState } from '@/components/UI';

const supabase = createClient();

export type Announcement = {
  id: string;
  title: string | null;
  body: string;
  author_name: string | null;
  created_at: string;
};

export type PersoNotif = {
  id: string;
  type: string; // like_post | comment | reply | like_comment
  actor_name: string | null;
  post_id: string | null;
  comment_id: string | null;
  channel: string | null;
  excerpt: string | null;
  created_at: string;
};

type Item =
  | ({ kind: 'ann' } & Announcement)
  | ({ kind: 'perso' } & PersoNotif);

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `il y a ${Math.floor(s / 86400)} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function persoLabel(n: PersoNotif): string {
  const who = n.actor_name || 'Quelqu’un';
  switch (n.type) {
    case 'like_post':
      return `${who} a aimé votre publication`;
    case 'comment':
      return `${who} a commenté votre publication`;
    case 'reply':
      return `${who} a répondu à un commentaire sous votre publication`;
    case 'like_comment':
      return `${who} a aimé votre commentaire`;
    default:
      return `${who} a interagi avec votre publication`;
  }
}

function persoHref(n: PersoNotif): string {
  // Lien direct vers la publication concernée
  return n.post_id ? `/post/${n.post_id}` : '/communaute';
}

function merge(anns: Announcement[], persos: PersoNotif[]): Item[] {
  const items: Item[] = [
    ...anns.map((a) => ({ kind: 'ann' as const, ...a })),
    ...persos.map((p) => ({ kind: 'perso' as const, ...p })),
  ];
  return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export default function NotificationsClient({
  userId,
  initialAnnouncements,
  initialPerso,
}: {
  userId: string;
  initialAnnouncements: Announcement[];
  initialPerso: PersoNotif[];
}) {
  const [anns, setAnns] = useState<Announcement[]>(initialAnnouncements);
  const [persos, setPersos] = useState<PersoNotif[]>(initialPerso);

  // Tout marquer comme lu dès l'ouverture (annonces + interactions).
  // IMPORTANT : il faut attendre la promesse — un builder supabase non attendu
  // n'envoie JAMAIS la requête (c'était le bug de la pastille qui revenait).
  useEffect(() => {
    void (async () => {
      await supabase.rpc('mark_announcements_read');
      await supabase.rpc('mark_notifications_read');
    })();
  }, []);

  // Temps réel : annonces + interactions personnelles
  useEffect(() => {
    void ensureRealtimeAuth();
    const ch = supabase
      .channel('notifications-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          const a = payload.new as Announcement;
          setAnns((prev) => (prev.some((x) => x.id === a.id) ? prev : [a, ...prev]));
          supabase.rpc('mark_announcements_read').then(() => {});
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as PersoNotif;
          setPersos((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
          supabase.rpc('mark_notifications_read').then(() => {});
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);

  const items = merge(anns, persos);

  if (!items.length) {
    return (
      <EmptyState
        Icon={IconBell}
        title="Aucune notification pour le moment"
        text="Tu verras ici les annonces de l'équipe et les réactions à tes publications."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((it) =>
        it.kind === 'ann' ? (
          <div key={`a-${it.id}`} className="card p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
                <IconMegaphone width={20} height={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-ink">{it.title || 'Annonce'}</p>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(it.created_at)}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">{it.body}</p>
                <p className="mt-2 text-xs text-muted">
                  {it.author_name ? `Par ${it.author_name}` : "L'équipe de L'École des Freelances"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Link key={`p-${it.id}`} href={persoHref(it)} className="card block p-5 transition hover:bg-black/[0.02]">
            <div className="flex items-start gap-3">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  it.type.startsWith('like') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'
                }`}
              >
                {it.type.startsWith('like') ? (
                  <IconHeart width={20} height={20} />
                ) : (
                  <IconChat width={20} height={20} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{persoLabel(it)}</p>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(it.created_at)}</span>
                </div>
                {it.excerpt && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted">«&nbsp;{it.excerpt}&nbsp;»</p>
                )}
              </div>
            </div>
          </Link>
        )
      )}
    </div>
  );
}
