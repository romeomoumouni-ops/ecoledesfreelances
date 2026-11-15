'use client';

// Profils entrants : chiffres en temps réel (nouvelle réponse = mise à jour
// immédiate), répartition des situations, analyse IA, liste des réponses.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import { countBySituation, situationText, type OnboardingAnswer } from '@/lib/onboarding';
import { prettyName, timeAgo } from '@/lib/format';
import Avatar from '@/components/Avatar';

const supabase = createClient();

export type Analyse = { id: string; period_start: string; period_end: string; answers_count: number; body: string; created_at: string };

type Periode = '7' | '30' | 'all';

function initials(name: string) {
  return name.split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function ProfilsClient({ initial, analyse }: { initial: OnboardingAnswer[]; analyse: Analyse | null }) {
  const router = useRouter();
  const [periode, setPeriode] = useState<Periode>('7');
  const [query, setQuery] = useState('');
  const [situ, setSitu] = useState<string>('');
  const [current, setCurrent] = useState<Analyse | null>(analyse);
  const [analysing, setAnalysing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [visible, setVisible] = useState(100);

  // Temps réel : chaque nouvelle réponse rafraîchit la page (données serveur à jour)
  useEffect(() => {
    void ensureRealtimeAuth();
    const ch = supabase
      .channel('profils-entrants')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'onboarding_answers' }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [router]);

  const since = useMemo(() => {
    if (periode === 'all') return 0;
    return Date.now() - Number(periode) * 86400_000;
  }, [periode]);

  const inPeriod = useMemo(() => initial.filter((a) => new Date(a.created_at).getTime() >= since), [initial, since]);
  const today = initial.filter((a) => Date.now() - new Date(a.created_at).getTime() < 86400_000).length;
  const repartition = countBySituation(inPeriod);
  const maxN = Math.max(1, ...repartition.map((r) => r.n));

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inPeriod.filter(
      (a) =>
        (!situ || a.situation === situ) &&
        (!q ||
          (a.full_name ?? '').toLowerCase().includes(q) ||
          (a.email ?? '').toLowerCase().includes(q) ||
          a.motivation.toLowerCase().includes(q) ||
          (a.situation_autre ?? '').toLowerCase().includes(q))
    );
  }, [inPeriod, query, situ]);

  async function lancerAnalyse() {
    setAnalysing(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/profils/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: periode === 'all' ? 3650 : Number(periode) }),
      });
      const j = (await res.json().catch(() => ({}))) as { analyse?: Analyse; error?: string };
      if (!res.ok || !j.analyse) throw new Error(j.error || 'Analyse impossible.');
      setCurrent(j.analyse);
      setMsg('Analyse mise à jour ✅');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Analyse impossible.');
    } finally {
      setAnalysing(false);
      setTimeout(() => setMsg(null), 5000);
    }
  }

  const periodeLabel = periode === '7' ? '7 derniers jours' : periode === '30' ? '30 derniers jours' : 'depuis le début';

  return (
    <>
      <h1 className="mb-1 flex items-center gap-2.5 text-xl font-bold text-ink">
        Profils entrants
        <span className="chip bg-black/[0.05] text-xs font-semibold text-muted">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" /> Temps réel
        </span>
      </h1>
      <p className="mb-4 text-sm text-muted">
        Ce que répondent les nouveaux élèves à leur première connexion : pourquoi ils ont rejoint l&apos;incubateur, et
        leur situation. Un rapport t&apos;est envoyé par e-mail chaque mardi matin.
      </p>

      {/* Période */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(['7', '30', 'all'] as Periode[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriode(p)}
            className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
              periode === p ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-[#dcdcda]'
            }`}
          >
            {p === '7' ? '7 jours' : p === '30' ? '30 jours' : 'Tout'}
          </button>
        ))}
      </div>

      {/* Chiffres */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Nouveaux profils</p>
          <p className="mt-1 text-2xl font-bold text-ink">{inPeriod.length.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-muted">{periodeLabel}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dernières 24 h</p>
          <p className="mt-1 text-2xl font-bold text-ink">{today}</p>
          <p className="text-xs text-muted">réponse(s)</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Depuis le début</p>
          <p className="mt-1 text-2xl font-bold text-ink">{initial.length.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-muted">profils renseignés</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Profil dominant</p>
          <p className="mt-1 truncate text-2xl font-bold text-ink">
            {inPeriod.length ? [...repartition].sort((a, b) => b.n - a.n)[0].label : '—'}
          </p>
          <p className="text-xs text-muted">{inPeriod.length ? `${[...repartition].sort((a, b) => b.n - a.n)[0].pct} % des réponses` : 'en attente'}</p>
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        {/* Répartition des situations */}
        <div className="card p-4 lg:col-span-2">
          <p className="mb-3 text-sm font-bold text-ink">Situation actuelle</p>
          {repartition.map((r) => (
            <button
              key={r.key}
              onClick={() => setSitu(situ === r.key ? '' : r.key)}
              className={`mb-2 block w-full rounded-lg p-1.5 text-left transition ${situ === r.key ? 'bg-black/[0.04]' : 'hover:bg-black/[0.02]'}`}
              title="Filtrer la liste"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-ink">{r.label}</span>
                <span className="text-muted">
                  {r.n} · {r.pct} %
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
                <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${(r.n / maxN) * 100}%` }} />
              </div>
            </button>
          ))}
          {!inPeriod.length && <p className="text-sm text-muted">Aucune réponse sur la période.</p>}
        </div>

        {/* Analyse IA */}
        <div className="card p-4 lg:col-span-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-ink">Analyse</p>
            {current && (
              <span className="text-xs text-muted">
                · {current.answers_count} réponse(s) · générée {timeAgo(current.created_at)}
              </span>
            )}
            <button onClick={lancerAnalyse} disabled={analysing || !inPeriod.length} className="btn-outline ml-auto !py-1.5 text-xs disabled:opacity-50">
              {analysing ? 'Analyse en cours…' : current ? `Actualiser (${periodeLabel})` : `Analyser (${periodeLabel})`}
            </button>
          </div>
          {msg && <p className="mb-2 text-xs font-semibold text-muted">{msg}</p>}
          {current ? (
            <div className="space-y-3 text-sm leading-relaxed text-ink">
              {current.body.split(/\n\s*\n/).map((para, i) => {
                const m = para.match(/^([A-ZÀ-Ü][A-ZÀ-Ü ’']{2,30})\s*:\s*([\s\S]*)$/);
                return (
                  <p key={i} className="whitespace-pre-line">
                    {m ? (
                      <>
                        <span className="font-bold">{m[1]} :</span> {m[2]}
                      </>
                    ) : (
                      para
                    )}
                  </p>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Pas encore d&apos;analyse. Clique sur « Analyser » dès qu&apos;il y a quelques réponses : l&apos;IA dégage les grandes
              motivations, les profils et ce qu&apos;il faut en faire.
            </p>
          )}
        </div>
      </div>

      {/* Liste des réponses */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="input sm:max-w-sm" placeholder="Rechercher un nom, un e-mail, un mot…" />
        {situ && (
          <button onClick={() => setSitu('')} className="btn-outline">
            Filtre : {repartition.find((r) => r.key === situ)?.label} ✕
          </button>
        )}
        <p className="text-xs text-muted sm:ml-auto">{list.length.toLocaleString('fr-FR')} réponse(s)</p>
      </div>
      {list.length ? (
        <div className="card divide-y divide-line overflow-hidden">
          {list.slice(0, visible).map((a) => {
            const name = a.full_name || prettyName(a.email ?? '');
            return (
              <div key={a.user_id} className="flex gap-3 p-4">
                <Avatar initials={initials(name || 'M')} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="font-semibold text-ink">{name}</p>
                    <p className="truncate text-xs text-muted">{a.email}</p>
                    <p className="ml-auto text-xs text-muted">{timeAgo(a.created_at)}</p>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-muted">{situationText(a)}</p>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">{a.motivation}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-10 text-center text-sm text-muted">
          {initial.length ? 'Aucune réponse ne correspond.' : 'Les premières réponses apparaîtront ici dès qu’un nouvel élève se connectera.'}
        </div>
      )}
      {list.length > visible && (
        <div className="mt-3 flex justify-center">
          <button onClick={() => setVisible((v) => v + 100)} className="btn-outline px-6">
            Voir plus ({(list.length - visible).toLocaleString('fr-FR')} restants)
          </button>
        </div>
      )}
    </>
  );
}
