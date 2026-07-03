'use client';

// Écran de blocage d'accès (paiement requis ou échéance à régler).
// Affiché à la place de l'application tant que l'accès n'est pas actif.

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import { IconShield, IconArrowRight, IconLogout } from '@/components/Icons';

const PAY_LINKS: Record<string, string> = {
  '1x': 'https://romeomoumouni.mychariow.store/prd_97u01b/checkout',
  '3x': 'https://romeomoumouni.mychariow.store/prd_ocqbu9/checkout',
  '6x': 'https://romeomoumouni.mychariow.shop/prd_mq2c4np5/checkout',
};

export type AccessState = {
  reason: 'expired' | 'no_purchase';
  plan?: string;
  payments_count?: number;
  total_payments?: number;
};

export default function AccessBlocked({ email, state }: { email: string; state: AccessState }) {
  const router = useRouter();
  const expired = state.reason === 'expired';
  const plan = state.plan && PAY_LINKS[state.plan] ? state.plan : null;
  const nextNumber = (state.payments_count ?? 0) + 1;

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/connexion');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="card p-6 sm:p-8">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-black/[0.05] text-ink">
            <IconShield width={22} height={22} />
          </span>

          <h1 className="mt-4 text-center text-xl font-bold text-ink">
            {expired ? 'Ton accès est en pause' : 'Accès réservé aux membres'}
          </h1>

          <p className="mt-2 text-center text-sm leading-relaxed text-muted">
            {expired && plan ? (
              <>
                Ta dernière échéance est arrivée à terme. Règle le paiement{' '}
                <b className="text-ink">
                  {Math.min(nextNumber, state.total_payments ?? nextNumber)} sur {state.total_payments}
                </b>{' '}
                pour réactiver ton accès automatiquement.
              </>
            ) : expired ? (
              <>Ta dernière échéance est arrivée à terme. Règle ton paiement pour réactiver ton accès.</>
            ) : (
              <>
                Aucun achat n&apos;est associé à <b className="text-ink">{email}</b>. L&apos;accès à la
                plateforme s&apos;obtient en achetant le programme.
              </>
            )}
          </p>

          <div className="mt-6 space-y-2.5">
            {expired && plan ? (
              <a href={PAY_LINKS[plan]} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
                Régler mon échéance
                <IconArrowRight width={17} height={17} />
              </a>
            ) : (
              <>
                <a href={PAY_LINKS['1x']} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
                  Paiement en 1 fois <IconArrowRight width={17} height={17} />
                </a>
                <a href={PAY_LINKS['3x']} target="_blank" rel="noopener noreferrer" className="btn-outline w-full">
                  Paiement en 3 fois
                </a>
                <a href={PAY_LINKS['6x']} target="_blank" rel="noopener noreferrer" className="btn-outline w-full">
                  Paiement en 6 fois
                </a>
              </>
            )}
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted">
            Paye avec <b className="text-ink">l&apos;adresse e-mail de ton compte</b> ({email}).
            Ton accès se réactive automatiquement quelques instants après le paiement — recharge
            simplement cette page.
          </p>

          {!expired && (
            <button
              onClick={() => router.refresh()}
              className="btn-outline mt-4 w-full"
            >
              J&apos;ai payé — vérifier mon accès
            </button>
          )}
        </div>

        {!expired && (
          <button
            onClick={logout}
            className="mx-auto mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:text-ink"
          >
            <IconLogout width={16} height={16} /> Se déconnecter
          </button>
        )}
      </div>
    </div>
  );
}
