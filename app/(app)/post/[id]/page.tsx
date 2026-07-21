export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/user';
import { SinglePostView } from '@/components/Feed';
import { IconChevronRight } from '@/components/Icons';

/**
 * Lien de partage d'une publication (/post/[id]).
 * Protégé comme tout l'espace membre : sans compte → page de connexion ;
 * connecté (avec accès actif) → la publication s'affiche directement.
 */
export default async function PostPage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');

  const backHref = '/communaute';
  const backLabel = 'Communauté';

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
      >
        <IconChevronRight width={16} height={16} className="rotate-180" /> {backLabel}
      </Link>

      <SinglePostView
        me={{
          id: profile.id,
          name: profile.full_name,
          isAdmin: profile.is_admin,
          avatarUrl: profile.avatar_url,
        }}
        postId={params.id}
      />
    </div>
  );
}
