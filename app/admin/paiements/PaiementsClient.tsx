'use client';

// Espace super admin : chiffre d'affaires + suivi des échéances (temps réel).

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import type { ClientAcces, Revenue } from './page';
import { IconUsers, IconCheckCircle, IconCard, IconX } from '@/components/Icons';

const supabase = createClient();

const PLAN_LABEL: Record<string, string> = {
  '1x': 'Paiement en 1 fois',
  '3x': 'Paiement en 3 fois',
  '6x': 'Paiement en 6 fois',
  coach15: 'Recharges Super Coach',
};

// Montant d'une tranche selon le plan.
const TRANCHE_PRICE: Record<string, number> = { '3x': 45000, '6x': 20000 };

function fcfa(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

type Statut = 'a_vie' | 'actif' | 'expire';

function statutOf(c: ClientAcces, now: number): Statut {
  if (c.access_until === null) return 'a_vie';
  return new Date(c.access_until).getTime() > now ? 'actif' : 'expire';
}

function dateFr(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatutChip({ c, now }: { c: ClientAcces; now: number }) {
  const s = statutOf(c, now);
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
  const router = useRouter();
  const [view, setView] = useState<'echeances' | 'ca'>('echeances');
  const [query, setQuery] = useState('');
  const [filtre, setFiltre] = useState<'tous' | Statut>('tous');
  // « Maintenant » rafraîchi chaque minute → les accès qui expirent basculent en direct.
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Temps réel : un paiement (chariow_purchases) ou un changement d'accès
  // (prolongation, expiration enregistrée) recharge les données du serveur.
  useEffect(() => {
    void ensureRealtimeAuth();
    const ch = supabase
      .channel('super-admin-echeances')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'access_grants' }, () => router.refresh())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chariow_purchases' }, () => router.refresh())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [router]);

  const stats = useMemo(() => {
    let aVie = 0, actifs = 0, expires = 0;
    for (const c of clients) {
      const s = statutOf(c, now);
      if (s === 'a_vie') aVie++;
      else if (s === 'actif') actifs++;
      else expires++;
    }
    return { total: clients.length, aVie, actifs, expires };
  }, [clients, now]);

  // Suivi des échéances (uniquement les plans échelonnés 3x / 6x).
  const ech = useMemo(() => {
    let blocked = 0, active = 0, soldes = 0;
    let paidCount = 0, remCount = 0, paidAmount = 0, remAmount = 0;
    const per: Record<string, { total: number; bloques: number; en_cours: number; rem_tranches: number; rem_montant: number }> = {
      '3x': { total: 0, bloques: 0, en_cours: 0, rem_tranches: 0, rem_montant: 0 },
      '6x': { total: 0, bloques: 0, en_cours: 0, rem_tranches: 0, rem_montant: 0 },
    };
    for (const c of clients) {
      if (c.plan !== '3x' && c.plan !== '6x') continue;
      if (!c.on_platform) continue; // seulement les étudiants réellement inscrits
      const price = TRANCHE_PRICE[c.plan];
      const paid = Math.min(c.payments_count, c.total_payments);
      const rem = Math.max(0, c.total_payments - c.payments_count);
      paidCount += paid;
      remCount += rem;
      paidAmount += paid * price;
      remAmount += rem * price;
      per[c.plan].total++;
      per[c.plan].rem_tranches += rem;
      per[c.plan].rem_montant += rem * price;
      const s = statutOf(c, now);
      if (s === 'a_vie') soldes++;
      else if (s === 'expire') { blocked++; per[c.plan].bloques++; }
      else { active++; per[c.plan].en_cours++; }
    }
    return { count: per['3x'].total + per['6x'].total, blocked, active, soldes, paidCount, remCount, paidAmount, remAmount, per };
  }, [clients, now]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (q && !c.email.includes(q)) return false;
      if (filtre !== 'tous' && statutOf(c, now) !== filtre) return false;
      return true;
    });
  }, [clients, query, filtre, now]);

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
        Espace réservé au fondateur. Les chiffres se mettent à jour <b className="text-ink">en temps réel</b> à
        chaque paiement.
      </p>

      {/* Onglets */}
      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setView('echeances')}
          className={`chip px-4 py-2.5 text-sm transition ${
            view === 'echeances' ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'
          }`}
        >
          Suivi des échéances
        </button>
        <button
          onClick={() => setView('ca')}
          className={`chip px-4 py-2.5 text-sm transition ${
            view === 'ca' ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'
          }`}
        >
          Chiffre d&apos;affaires & clients
        </button>
      </div>

      {view === 'echeances' ? (
        <>
          <p className="mb-4 text-sm text-muted">
            Suivi des étudiants qui paient <b className="text-ink">en plusieurs fois</b> (3× ou 6×) et qui ont
            <b className="text-ink"> créé leur compte</b>. Mis à jour en temps réel.
          </p>

          {/* 1) LES ÉTUDIANTS */}
          <div className="card mb-4 p-5">
            <p className="text-sm font-bold text-ink">Étudiants qui paient en plusieurs fois</p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-ink">
              {ech.count.toLocaleString('fr-FR')}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-2xl font-bold text-emerald-700">{ech.active.toLocaleString('fr-FR')}</p>
                <p className="mt-0.5 text-xs font-medium text-emerald-700/80">
                  à jour — accès actif, ils paient bien
                </p>
              </div>
              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-2xl font-bold text-red-600">{ech.blocked.toLocaleString('fr-FR')}</p>
                <p className="mt-0.5 text-xs font-medium text-red-600/80">
                  bloqués — leur mois a expiré, à relancer
                </p>
              </div>
              <div className="rounded-xl bg-black/[0.04] p-4">
                <p className="text-2xl font-bold text-ink">{ech.soldes.toLocaleString('fr-FR')}</p>
                <p className="mt-0.5 text-xs font-medium text-muted">
                  ont fini de payer — accès à vie
                </p>
              </div>
            </div>
          </div>

          {/* 2) L'ARGENT */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700/80">
                Déjà encaissé
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-emerald-700">{fcfa(ech.paidAmount)}</p>
              <p className="mt-1 text-xs text-muted">
                sur {ech.paidCount.toLocaleString('fr-FR')} tranche(s) déjà payée(s) par ces étudiants
              </p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700/80">
                Encore à collecter
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-amber-700">{fcfa(ech.remAmount)}</p>
              <p className="mt-1 text-xs text-muted">
                sur {ech.remCount.toLocaleString('fr-FR')} tranche(s) qu&apos;il leur reste à payer
              </p>
            </div>
          </div>

          {/* Détail par formule */}
          <div className="card overflow-hidden">
            <p className="border-b border-line p-4 text-sm font-bold text-ink">Détail par formule</p>
            <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {(['3x', '6x'] as const).map((p) => (
                <div key={p} className="p-4">
                  <p className="text-sm font-bold text-ink">
                    {PLAN_LABEL[p]} <span className="text-xs font-normal text-muted">({fcfa(TRANCHE_PRICE[p])} / tranche)</span>
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-ink">
                    <p className="flex justify-between"><span className="text-muted">Étudiants</span><b>{ech.per[p].total.toLocaleString('fr-FR')}</b></p>
                    <p className="flex justify-between"><span className="text-muted">Bloqués (à relancer)</span><b className="text-red-600">{ech.per[p].bloques.toLocaleString('fr-FR')}</b></p>
                    <p className="flex justify-between"><span className="text-muted">En cours (à jour)</span><b>{ech.per[p].en_cours.toLocaleString('fr-FR')}</b></p>
                    <p className="flex justify-between"><span className="text-muted">Tranches restantes</span><b>{ech.per[p].rem_tranches.toLocaleString('fr-FR')}</b></p>
                    <p className="flex justify-between"><span className="text-muted">Reste à collecter</span><b className="text-amber-700">{fcfa(ech.per[p].rem_montant)}</b></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
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
              <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                {['1x', '3x', '6x', 'coach15'].map((p) => (
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
                  <StatutChip c={c} now={now} />
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
      )}
    </>
  );
}
