'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/UI';
import Feed, { type FeedUser } from '@/components/Feed';
import { IconLock } from '@/components/Icons';

const CHANNELS = [
  { key: 'annonces', label: 'Annonces', adminOnly: true },
  { key: 'membres', label: 'Publications des membres' },
  { key: 'victoires', label: 'Vos victoires du jour' },
  { key: 'challenge', label: 'Challenge' },
  { key: 'ressources', label: 'Ressources', adminOnly: true },
  { key: 'temoignages', label: 'Résultats et témoignages' },
];

const PLACEHOLDERS: Record<string, string> = {
  victoires: 'Partage ta victoire du jour…',
  challenge: 'Partage ton avancée sur le challenge…',
  ressources: 'Partage une ressource utile (PDF, lien, conseil)…',
  temoignages: 'Présente tes chiffres, raconte tes résultats… (photo ou vidéo témoignage bienvenue)',
};

export default function CommunityClient({ me }: { me: FeedUser }) {
  const [channel, setChannel] = useState('membres');
  const current = CHANNELS.find((c) => c.key === channel);
  const canPost = !current?.adminOnly || me.isAdmin;

  return (
    <>
      {/* En-tête + onglets sur TOUTE la largeur : tous les canaux visibles d'un coup */}
      <PageHeader title="Communauté" subtitle="Partage, échange et progresse avec les autres membres." />

      <div className="scrollbar-hide mb-5 flex flex-wrap gap-2 pb-1">
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

      {/* Fil centré et étroit façon LinkedIn : plus agréable à lire */}
      <div className="mx-auto max-w-xl">
        {!canPost && (
          <div className="card mb-5 flex items-center gap-2 p-4 text-sm text-muted">
            <IconLock width={16} height={16} /> Seuls les administrateurs peuvent publier dans « {current?.label} ».
          </div>
        )}

        <Feed
          key={channel}
          me={me}
          channel={channel}
          canPost={canPost}
          placeholder={PLACEHOLDERS[channel] ?? 'Quoi de neuf ?'}
        />
      </div>
    </>
  );
}
