'use client';

// Onglet Paiements (admin) : clients ayant payé via Chariow, avec formule,
// échéances réglées et statut d'accès. Recherche par e-mail, compteurs en tête.

import { useMemo, useState } from 'react';
import type { ClientAcces, Revenue } from './page';
import { IconUsers, IconCheckCircle, IconCard, IconX } from '@/components/Icons';

const PLAN_LABEL: Record<string, string> = {
  '1x': 'Paiement en 1 fois',
  '3x': 'Paiement en 3 fois',
  '6x': 'Paiement en 6 fois',
};

function fcfa(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

type Statut = 'a_vie' | 'actif' | 'expire';

function statutOf(c: ClientAcces): Statut {
  if (c.access_until === null) return 'a_vie';
  return new Date(c.access_until).getTime() > Date.now() ? 'actif' : 'expire';
}

function dateFr(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatutChip({ c }: { c: ClientAcces }) {
  const s = statutOf(c);
  if (s === 'a_vie') return <span className="chip bg-ink text-white">À vie</span>;
  if (s === 'actif')
    return <span className="chip border border-line bg-white text-ink">Actif jusqu&apos;au {dateFr(c.access_until!)}</span>;
  return <span className="chip bg-red-50 text-red-600">Expiré</span>;
}

export default function PaiementsClient({
  clients,
  revenue,
}: {
  clients: ClientAcces[];
  revenue: Revenue | null;
}) {
  const [query, setQuery] = useState('');
  const [filtre, setFiltre] = useState<'tous' | Statut>('tous');

  const stats = useMemo(() => {
    let aVie = 0, actifs = 0, expires = 0;
    for (const c of clients) {
      const s = statutOf(c);
      if (s === 'a_vie') aVie++;
      else if (s === 'actif') actifs++;
      else expires++;
    }
    return { total: clients.length, aVie, actifs, expires };
  }, [clients]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (q && !c.email.includes(q)) return false;
      if (filtre !== 'tous' && statutOf(c) !== filtre) return false;
      return true;
    });
  }, [clients, query, filtre]);

  const compteurs: { key: 'tous' | Statut; label: string; value: number; Icon: typeof IconUsers }[] = [
    { key: 'tous', label: 'Clients', value: stats.total, Icon: IconUsers },
    { key: 'a_vie', label: 'À vie', value: stats.aVie, Icon: IconCheckCircle },
    { key: 'actif', label: 'En cours', value: stats.actifs, Icon: IconCard },
    { key: 'expire', label: 'Expirés', value: stats.expires, Icon: IconX },
  ];

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-ink">Accès super admin</h1>
      <p className="mb-4 text-sm text-muted">
        Espace réservé au fondateur : chiffre d&apos;affaires et clients Chariow. Les montants
        s&apos;ajoutent automatiquement à chaque paiement sur les 3 liens.
      </p>

      {/* Chiffre d'affaires */}
      {revenue && (
        <div className="card mb-4 overflow-hidden">
          <div className="border-b border-line bg-ink p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Chiffre d&apos;affaires total généré
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{fcfa(revenue.total)}</p>
            <p className="mt-1 text-xs text-white/60">{revenue.ventes.toLocaleString('fr-FR')} paiement(s) encaissé(s)</p>
          </div>
          <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {(['1x', '3x', '6x'] as const).map((p) => (
              <div key={p} className="p-4">
                <p className="text-xs font-medium text-muted">{PLAN_LABEL[p]}</p>
                <p className="mt-0.5 text-lg font-bold tracking-tight text-ink">
                  {fcfa(revenue.plans?.[p]?.montant ?? 0)}
                </p>
                <p className="text-xs text-muted">{(revenue.plans?.[p]?.ventes ?? 0).toLocaleString('fr-FR')} paiement(s)</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compteurs (cliquables = filtres) */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {compteurs.map(({ key, label, value, Icon }) => (
          <button
            key={key}
            onClick={() => setFiltre(key)}
            className={`card p-4 text-left transition ${
              filtre === key ? 'border-ink' : 'hover:border-[#e0e0de]'
            }`}
          >
            <span className="flex items-center justify-between">
              <span className="text-2xl font-bold tracking-tight text-ink">{value.toLocaleString('fr-FR')}</span>
              <Icon width={18} height={18} className="text-muted" />
            </span>
            <span className="mt-1 block text-xs font-medium text-muted">{label}</span>
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input mb-4 max-w-sm"
        placeholder="Rechercher un e-mail…"
      />

      {list.length ? (
        <div className="card divide-y divide-line overflow-hidden">
          {list.slice(0, 200).map((c) => (
            <div key={c.email} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{c.email}</p>
                <p className="text-xs text-muted">
                  {PLAN_LABEL[c.plan] ?? c.plan} · {Math.min(c.payments_count, c.total_payments)}/{c.total_payments} échéance(s) payée(s)
                </p>
              </div>
              <StatutChip c={c} />
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center text-sm text-muted">Aucun client ne correspond.</div>
      )}

      {list.length > 200 && (
        <p className="mt-3 text-center text-xs text-muted">
          {list.length.toLocaleString('fr-FR')} résultats — affinez la recherche pour voir le reste (200 affichés).
        </p>
      )}
    </>
  );
}
