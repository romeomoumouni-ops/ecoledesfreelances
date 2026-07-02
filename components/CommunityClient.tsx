'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/UI';
import Feed, { type FeedUser } from '@/components/Feed';
import { IconLock } from '@/components/Icons';

const CHANNELS = [
  { key: 'annonces', label: 'Annonces', adminOnly: true },
  { key: 'membres', label: 'Publications des membres' },
  { key: 'victoires', label: 'Vos victoires du jour' },
];

export default function CommunityClient({ me }: { me: FeedUser }) {
  const [channel, setChannel] = useState('membres');
  const canPost = channel !== 'annonces' || me.isAdmin;

  return (
    <>
      <PageHeader title="Communauté" subtitle="Partagez, échangez et progressez ensemble." />

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

      {!canPost && (
        <div className="card mb-5 flex items-center gap-2 p-4 text-sm text-muted">
          <IconLock width={16} height={16} /> Seuls les administrateurs peuvent publier des annonces.
        </div>
      )}

      <Feed
        key={channel}
        me={me}
        channel={channel}
        canPost={canPost}
        placeholder={channel === 'victoires' ? 'Partage ta victoire du jour…' : 'Quoi de neuf ?'}
      />
    </>
  );
}
