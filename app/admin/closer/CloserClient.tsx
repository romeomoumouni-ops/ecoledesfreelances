'use client';

// Section « Closer » : les acheteurs des 3 formules, avec bouton WhatsApp
// direct (wa.me + numéro utilisé à l'achat). Tri du plus récent au plus ancien
// (inversable) + recherche + synchronisation des numéros depuis Chariow.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import type { Achat } from './page';
import { prettyName, timeAgo } from '@/lib/format';
import Avatar from '@/components/Avatar';

const supabase = createClient();

const TABS: { key: string; label: string; sub: string }[] = [
  { key: '1x', label: '98 000 FCFA', sub: 'Paiement en 1 fois' },
  { key: '3x', label: '45 000 FCFA', sub: 'Paiement en 3 fois' },
  { key: '6x', label: '20 000 FCFA', sub: 'Paiement en 6 fois' },
];

function initials(name: string) {
  return name.split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.62 15.06L2 22l5.09-1.33A10 10 0 1 0 12 2Zm0 18.13c-1.5 0-2.97-.4-4.26-1.15l-.3-.18-3.02.79.8-2.95-.19-.3A8.13 8.13 0 1 1 12 20.13Zm4.46-6.09c-.24-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.53.06-.24-.12-1.03-.38-1.96-1.21-.72-.64-1.21-1.44-1.35-1.68-.14-.24-.02-.37.11-.5.11-.11.24-.28.37-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.34.99 2.5c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.05.14-1.16-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

export default function CloserClient({ achats, sansNumero }: { achats: Achat[]; sansNumero: number }) {
  const router = useRouter();
  const [tab, setTab] = useState<'1x' | '3x' | '6x'>('1x');
  const [recent, setRecent] = useState(true); // true = plus récent d'abord
  const [query, setQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Temps réel : dès qu'un paiement arrive, la liste se met à jour toute seule
  // (le nouveau client apparaît en haut ou en bas selon le tri choisi).
  useEffect(() => {
    void ensureRealtimeAuth();
    const ch = supabase
      .channel('closer-ventes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chariow_purchases' }, (payload) => {
        const p = payload.new as { plan?: string };
        if (p.plan === '1x' || p.plan === '3x' || p.plan === '6x') router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [router]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { '1x': 0, '3x': 0, '6x': 0 };
    for (const a of achats) c[a.plan] = (c[a.plan] ?? 0) + 1;
    return c;
  }, [achats]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return achats
      .filter((a) => a.plan === tab)
      .filter(
        (a) =>
          !q ||
          a.email.includes(q) ||
          (a.customer_name ?? '').toLowerCase().includes(q) ||
          (a.customer_phone ?? '').includes(q.replace(/\D/g, '') || '__')
      )
      .sort((a, b) =>
        recent
          ? b.last_paid_at.localeCompare(a.last_paid_at)
          : a.last_paid_at.localeCompare(b.last_paid_at)
      );
  }, [achats, tab, recent, query]);

  // Récupère les numéros manquants auprès de Chariow, lot par lot.
  async function sync() {
    setSyncing(true);
    setSyncMsg('Synchronisation en cours…');
    try {
      for (let i = 0; i < 50; i++) {
        const res = await fetch('/api/admin/closer-sync', { method: 'POST' });
        const j = (await res.json().catch(() => null)) as
          | { traitees?: number; restantes?: number; error?: string }
          | null;
        if (!res.ok) throw new Error(j?.error ?? 'Échec de la synchronisation.');
        const restantes = j?.restantes ?? 0;
        setSyncMsg(`Synchronisation… ${restantes.toLocaleString('fr-FR')} vente(s) restante(s)`);
        if (!j?.traitees || restantes <= 0) break;
      }
      setSyncMsg('Synchronisation terminée ✅');
      router.refresh();
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : 'Échec de la synchronisation.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 6000);
    }
  }

  return (
    <>
      <h1 className="mb-1 flex items-center gap-2.5 text-xl font-bold text-ink">
        Closer
        <span className="chip bg-black/[0.05] text-xs font-semibold text-muted">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" /> Temps réel
        </span>
      </h1>
      <p className="mb-4 text-sm text-muted">
        Les clients des 3 formules, avec leur numéro WhatsApp d&apos;achat. Chaque nouveau paiement
        apparaît ici automatiquement. Un clic sur le bouton vert ouvre la conversation.
      </p>

      {/* Synchronisation des numéros (ventes passées) */}
      {(sansNumero > 0 || syncMsg) && (
        <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
          <p className="min-w-0 flex-1 text-sm text-ink">
            {syncMsg ??
              `${sansNumero.toLocaleString('fr-FR')} vente(s) n'ont pas encore leur numéro (achats passés). Lance la synchronisation pour les récupérer depuis Chariow.`}
          </p>
          <button onClick={sync} disabled={syncing} className="btn-primary disabled:opacity-60">
            {syncing ? 'Synchronisation…' : 'Synchroniser les numéros'}
          </button>
        </div>
      )}

      {/* Onglets des 3 formules */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as '1x' | '3x' | '6x')}
            className={`rounded-xl border p-3 text-left transition ${
              tab === t.key ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-[#dcdcda]'
            }`}
          >
            <p className="text-sm font-bold">{t.label}</p>
            <p className={`text-xs ${tab === t.key ? 'text-white/70' : 'text-muted'}`}>
              {t.sub} · {(counts[t.key] ?? 0).toLocaleString('fr-FR')} client(s)
            </p>
          </button>
        ))}
      </div>

      {/* Recherche + tri */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input sm:max-w-sm"
          placeholder="Rechercher un nom, un e-mail, un numéro…"
        />
        <button onClick={() => setRecent((v) => !v)} className="btn-outline sm:ml-auto">
          Tri : {recent ? 'du plus récent au plus ancien' : 'du plus ancien au plus récent'} ⇅
        </button>
      </div>

      {/* Liste des clients */}
      {list.length ? (
        <div className="card divide-y divide-line overflow-hidden">
          {list.map((a) => {
            const displayName = a.customer_name || prettyName(a.email);
            const phoneOk = !!a.customer_phone && a.customer_phone !== 'aucun';
            return (
              <div key={`${a.plan}-${a.email}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
                <Avatar initials={initials(displayName)} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{displayName}</p>
                  <p className="truncate text-xs text-muted">
                    {a.email} · a payé {timeAgo(a.last_paid_at)}
                    {a.plan !== '1x' && ` · ${a.payments} paiement(s)`}
                  </p>
                </div>
                {phoneOk ? (
                  <a
                    href={`https://wa.me/${a.customer_phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#25D366] px-3.5 py-2 text-sm font-bold text-white transition hover:bg-[#1fb958]"
                  >
                    <WhatsAppIcon /> Contacter le client sur WhatsApp
                  </a>
                ) : (
                  <span className="chip shrink-0 bg-black/[0.05] text-muted">
                    {a.customer_phone === 'aucun' ? 'Numéro non fourni à l’achat' : 'Numéro à synchroniser'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-10 text-center text-sm text-muted">Aucun client ne correspond.</div>
      )}

      <p className="mt-3 text-center text-xs text-muted">
        {list.length.toLocaleString('fr-FR')} client(s) affiché(s) — données issues des ventes Chariow.
      </p>
    </>
  );
}
