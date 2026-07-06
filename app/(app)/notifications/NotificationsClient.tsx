'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import { IconBell, IconMegaphone } from '@/components/Icons';

const supabase = createClient();

export type Announcement = {
  id: string;
  title: string | null;
  body: string;
  author_name: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `il y a ${Math.floor(s / 86400)} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function NotificationsClient({ initial }: { initial: Announcement[] }) {
  const [items, setItems] = useState<Announcement[]>(initial);

  // Marque toutes les notifications comme lues dès l'ouverture de la page
  useEffect(() => {
    void supabase.rpc('mark_announcements_read');
  }, []);

  // Temps réel : une nouvelle annonce apparaît en direct (et reste lue)
  useEffect(() => {
    void ensureRealtimeAuth();
    const ch = supabase
      .channel('notifications-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          const a = payload.new as Announcement;
          setItems((prev) => (prev.some((x) => x.id === a.id) ? prev : [a, ...prev]));
          void supabase.rpc('mark_announcements_read');
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  if (!items.length) {
    return (
      <div className="card flex flex-col items-center gap-3 p-12 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-black/[0.04] text-muted">
          <IconBell width={24} height={24} />
        </span>
        <p className="text-sm text-muted">Aucune notification pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="card p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
              <IconMegaphone width={20} height={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-ink">{a.title || 'Annonce'}</p>
                <span className="shrink-0 text-xs text-muted">{timeAgo(a.created_at)}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">{a.body}</p>
              <p className="mt-2 text-xs text-muted">
                {a.author_name ? `Par ${a.author_name}` : "L'équipe de L'École des Freelances"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
