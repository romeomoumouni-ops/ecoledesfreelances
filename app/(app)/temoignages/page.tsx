export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/user';
import { PageHeader } from '@/components/UI';
import Feed from '@/components/Feed';
import { markScopeRead } from '@/lib/read-marks';
import { IconTrend } from '@/components/Icons';

export default async function TemoignagesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');

  // Ouverture = tout lu → la pastille « Résultats et témoignages » retombe.
  await markScopeRead(profile.id, 'temoignages');

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Résultats et témoignages"
        subtitle="Les preuves que ça marche, par ceux qui le vivent."
      />

      {/* Bandeau d'appel */}
      <div className="card mb-5 flex items-start gap-4 p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-black/[0.04] text-ink">
          <IconTrend width={22} height={22} />
        </span>
        <p className="text-sm leading-relaxed text-ink">
          <b>Présente tes chiffres</b> et <b>publie tes vidéos témoignages</b> pour
          recommander l&apos;incubateur à ceux qui hésitent. Tes résultats inspirent
          les prochains !
        </p>
      </div>

      <Feed
        me={{
          id: profile.id,
          name: profile.full_name,
          isAdmin: profile.is_admin,
          avatarUrl: profile.avatar_url,
        }}
        channel="temoignages"
        placeholder="Présente tes chiffres, raconte tes résultats… (ajoute une photo ou une vidéo témoignage)"
        emptyText="Aucun témoignage pour l'instant."
      />
    </div>
  );
}
