import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/user';
import { createClient } from '@/lib/supabase/server';
import PostMakerClient from './PostMakerClient';
import PostMakerSubscribe from './PostMakerSubscribe';
import PostMakerVideo from './PostMakerVideo';
import { IconSparkle, IconCheck } from '@/components/Icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'AI Post Maker' };

function Paywall({ checkoutUrl }: { checkoutUrl: string }) {
  const perks = [
    'Génération de posts illimitée (LinkedIn, Instagram, X, TikTok…)',
    'Assistant de prospection : messages d’approche personnalisés',
    'Aide au closing : quoi répondre à chaque message du client',
    'Adapté à ta niche, ton ton et tes mots-clés',
  ];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-soft">
          <IconSparkle width={22} height={22} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">AI Post Maker</h1>
          <p className="text-sm text-muted">Ton assistant IA pour créer du contenu et signer des clients.</p>
        </div>
      </div>

      {/* Vidéo de présentation (entre le titre et l'offre) */}
      <PostMakerVideo />

      <div className="overflow-hidden rounded-3xl border border-orange-200 bg-white">
        <div className="bg-gradient-to-br from-orange-50 to-white px-6 py-7 sm:px-8">
          <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-700">
            Outil premium
          </span>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-ink">15 000 FCFA</span>
            <span className="pb-1 text-sm font-semibold text-muted">/ mois</span>
          </div>
          <p className="mt-1 text-sm text-muted">Génération de posts et de messages <strong className="text-ink">illimitée</strong>. Sans engagement.</p>

          <ul className="mt-5 space-y-2.5">
            {perks.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-ink">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-orange-500 text-white">
                  <IconCheck width={13} height={13} />
                </span>
                {p}
              </li>
            ))}
          </ul>

          <PostMakerSubscribe fallbackUrl={checkoutUrl} />
        </div>
      </div>
    </div>
  );
}

export default async function AiPostMakerPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');

  const supabase = createClient();
  const { data: access } = await supabase.rpc('my_post_maker_access');
  const a = (access ?? {}) as { active?: boolean; valid_until?: string | null };

  if (a.active !== true) {
    const checkoutUrl =
      process.env.POST_MAKER_CHECKOUT_URL || 'https://romeomoumouni.mychariow.shop/prd_n52m1d5e/checkout';
    return <Paywall checkoutUrl={checkoutUrl} />;
  }

  return <PostMakerClient name={profile.full_name} validUntil={a.valid_until ?? null} />;
}
