'use client';

import { IconArrowRight } from '@/components/Icons';

// Liens de paiement Chariow par plan (mêmes que l'écran de blocage /acces).
const PAY_LINKS: Record<string, string> = {
  '3x': 'https://romeomoumouni.mychariow.store/prd_ocqbu9/checkout',
  '6x': 'https://romeomoumouni.mychariow.shop/prd_mq2c4np5/checkout',
};
// Montant d'une tranche selon le plan.
const TRANCHE_AMOUNT: Record<string, string> = {
  '3x': '45 000',
  '6x': '20 000',
};

export type Installment = { plan: string; paymentsCount: number; totalPayments: number };

/**
 * Bandeau « Payer ma tranche maintenant » affiché sur chaque onglet aux membres
 * en paiement 3x / 6x qui n'ont pas fini de régler. Le bouton ouvre le paiement
 * Chariow correspondant à leur plan.
 */
export default function TranchePayBanner({ installment }: { installment: Installment }) {
  const { plan, paymentsCount, totalPayments } = installment;
  const link = PAY_LINKS[plan];
  const amount = TRANCHE_AMOUNT[plan];
  if (!link || !amount) return null;

  const nextNumber = Math.min(paymentsCount + 1, totalPayments);
  const remaining = Math.max(0, totalPayments - paymentsCount);

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink">
          Paiement en {plan === '3x' ? '3' : '6'} fois — tranche {nextNumber} sur {totalPayments}
        </p>
        <p className="mt-0.5 text-xs text-amber-800">
          Il te reste <b>{remaining}</b> tranche{remaining > 1 ? 's' : ''} à régler pour garder ton accès.
        </p>
      </div>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-accent flex-col gap-0 py-2.5 leading-tight sm:w-auto"
      >
        <span className="flex items-center gap-2">
          Payer ma tranche maintenant <IconArrowRight width={17} height={17} />
        </span>
        <span className="text-[11px] font-semibold opacity-90">({amount} FCFA)</span>
      </a>
    </div>
  );
}
