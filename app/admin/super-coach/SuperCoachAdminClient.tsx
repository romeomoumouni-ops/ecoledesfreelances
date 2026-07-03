'use client';

// Cerveau du Super Coach (mode gratuit, sans coût par message) :
// - FAQ : paires question -> réponse exacte de Roméo (servies telles quelles)
// - Contenus : transcripts/méthodes où l'IA pioche des extraits pertinents
// Recherche plein texte française côté Postgres — aucun appel payant.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import { IconPlus, IconX, IconSparkle, IconCard } from '@/components/Icons';
import type { Knowledge, Faq, CoachStats, CoachRevenue } from './page';

const supabase = createClient();

// Taux indicatif pour l'affichage en FCFA
const USD_FCFA = 600;

export default function SuperCoachAdminClient({
  items,
  faq,
  stats,
  creditUsd,
  revenue,
  isSuperAdmin,
}: {
  items: Knowledge[];
  faq: Faq[];
  stats: CoachStats | null;
  creditUsd: number;
  revenue: CoachRevenue | null;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'faq' | 'contenus' | 'stats' | 'revenus'>('faq');
  const [err, setErr] = useState<string | null>(null);

  return (
    <>
      <h1 className="mb-1 flex items-center gap-2 text-xl font-bold text-ink">
        <IconSparkle width={20} height={20} /> Super Coach — cerveau
      </h1>
      <p className="mb-4 text-sm text-muted">
        Le Super Coach répond gratuitement à partir de ce que vous mettez ici. Les{' '}
        <b className="text-ink">Questions/Réponses</b> sont servies telles quelles quand un élève pose une
        question proche ; les <b className="text-ink">Contenus</b> (transcripts, méthodes) fournissent des
        extraits. Question trop complexe → l&apos;IA redirige vers le suivi ou les coachs.
      </p>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('faq')}
          className={`chip px-4 py-2.5 text-sm transition ${
            tab === 'faq' ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'
          }`}
        >
          Questions/Réponses ({faq.length})
        </button>
        <button
          onClick={() => setTab('contenus')}
          className={`chip px-4 py-2.5 text-sm transition ${
            tab === 'contenus' ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'
          }`}
        >
          Contenus ({items.length})
        </button>
        <button
          onClick={() => setTab('stats')}
          className={`chip px-4 py-2.5 text-sm transition ${
            tab === 'stats' ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'
          }`}
        >
          Statistiques
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setTab('revenus')}
            className={`chip px-4 py-2.5 text-sm transition ${
              tab === 'revenus' ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'
            }`}
          >
            Revenus 💰
          </button>
        )}
      </div>

      {err && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      {tab === 'faq' ? (
        <FaqTab faq={faq} onError={setErr} onChange={() => router.refresh()} />
      ) : tab === 'contenus' ? (
        <ContenusTab items={items} onError={setErr} onChange={() => router.refresh()} />
      ) : tab === 'stats' ? (
        <StatsTab stats={stats} creditUsd={creditUsd} />
      ) : (
        <RevenusTab initial={revenue} />
      )}
    </>
  );
}

/* ---------- Onglet Revenus (super admin, temps réel) ---------- */
type Vente = { email: string; amount: number; created_at: string };

function RevenusTab({ initial }: { initial: CoachRevenue | null }) {
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [ventes, setVentes] = useState(initial?.ventes ?? 0);
  const [today, setToday] = useState(initial?.today ?? 0);
  const [month, setMonth] = useState(initial?.month ?? 0);
  const [list, setList] = useState<Vente[]>(initial?.list ?? []);
  const [flash, setFlash] = useState(false);

  // Temps réel : chaque paiement de recharge apparaît instantanément
  useEffect(() => {
    void ensureRealtimeAuth();
    const ch = supabase
      .channel('coach-revenus')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chariow_purchases', filter: 'plan=eq.coach15' },
        (payload) => {
          const p = payload.new as { email: string; amount: number | string | null; created_at: string };
          const amount = Number(p.amount ?? 1500);
          setList((l) => [{ email: p.email, amount, created_at: p.created_at }, ...l].slice(0, 100));
          setTotal((t) => t + amount);
          setVentes((n) => n + 1);
          setToday((t) => t + amount);
          setMonth((m) => m + amount);
          setFlash(true);
          setTimeout(() => setFlash(false), 3000);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  if (!initial) {
    return (
      <div className="card p-10 text-center text-sm text-muted">
        Cet onglet est réservé au super admin.
      </div>
    );
  }

  return (
    <>
      {/* Total généré */}
      <div className={`card mb-4 overflow-hidden transition-shadow ${flash ? 'ring-2 ring-green-400' : ''}`}>
        <div className="bg-ink p-5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Généré avec le Super Coach IA
            </p>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" /> Temps réel
            </span>
          </div>
          <p className="mt-1 text-3xl font-bold tracking-tight">{fcfa(total)}</p>
          <p className="mt-1 text-xs text-white/60">{ventes.toLocaleString('fr-FR')} recharge(s) de 15 questions</p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-line">
          <div className="p-4">
            <p className="text-xs font-medium text-muted">Aujourd&apos;hui</p>
            <p className="mt-0.5 text-lg font-bold tracking-tight text-ink">{fcfa(today)}</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-muted">Ce mois-ci</p>
            <p className="mt-0.5 text-lg font-bold tracking-tight text-ink">{fcfa(month)}</p>
          </div>
        </div>
      </div>

      {/* Liste des paiements */}
      <div className="card overflow-hidden">
        <p className="border-b border-line p-4 text-sm font-bold text-ink">Derniers paiements</p>
        {list.length ? (
          <div className="divide-y divide-line">
            {list.map((v, i) => (
              <div key={`${v.email}-${v.created_at}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/[0.04] text-ink">
                  <IconCard width={16} height={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{v.email}</p>
                  <p className="text-xs text-muted">
                    {new Date(v.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}{' '}
                    à{' '}
                    {new Date(v.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="chip bg-ink text-white">+{fcfa(v.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-muted">
            Aucune recharge pour l&apos;instant. Dès qu&apos;un élève paie, le paiement apparaît ici
            instantanément.
          </p>
        )}
      </div>
    </>
  );
}

/* ---------- Onglet Statistiques ---------- */
function usd(n: number) {
  return `${n.toFixed(2)} $`;
}
function fcfa(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

function StatsTab({ stats, creditUsd }: { stats: CoachStats | null; creditUsd: number }) {
  if (!stats) {
    return <div className="card p-8 text-center text-sm text-muted">Statistiques indisponibles pour l&apos;instant.</div>;
  }
  const remaining = Math.max(0, creditUsd - stats.cost_total_usd);
  const pctUsed = creditUsd > 0 ? Math.min(100, (stats.cost_total_usd / creditUsd) * 100) : 0;
  const netFcfa = stats.recharges_fcfa - stats.cost_total_usd * USD_FCFA;

  const Metric = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="card p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );

  return (
    <>
      {/* Crédit restant */}
      <div className="card mb-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Crédit Anthropic restant (estimation)</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-ink">
              {usd(remaining)} <span className="text-base font-semibold text-muted">/ {usd(creditUsd)}</span>
            </p>
            <p className="text-xs text-muted">≈ {fcfa(remaining * USD_FCFA)} restants</p>
          </div>
          <p className="text-sm font-semibold text-ink">{pctUsed.toFixed(1)} % utilisé</p>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-black/[0.07]">
          <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${pctUsed}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Basé sur la consommation réelle enregistrée. Si tu recharges ton crédit sur console.anthropic.com,
          mets à jour la variable SUPER_COACH_CREDIT_USD sur Vercel.
        </p>
      </div>

      {/* Compteurs */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Élèves ayant écrit"
          value={stats.users_total.toLocaleString('fr-FR')}
          sub={`${stats.users_today} aujourd'hui · ${stats.users_month} ce mois-ci`}
        />
        <Metric
          label="Questions IA"
          value={stats.ai_total.toLocaleString('fr-FR')}
          sub={`${stats.ai_today} aujourd'hui · ${stats.ai_month} ce mois-ci`}
        />
        <Metric
          label="Coût total"
          value={usd(stats.cost_total_usd)}
          sub={`≈ ${fcfa(stats.cost_total_usd * USD_FCFA)} · ${usd(stats.cost_month_usd)} ce mois-ci`}
        />
        <Metric
          label="Recharges encaissées"
          value={fcfa(stats.recharges_fcfa)}
          sub={`Net (recharges − coût) : ${fcfa(netFcfa)}`}
        />
      </div>

      {/* 14 derniers jours */}
      <div className="card overflow-hidden">
        <p className="border-b border-line p-4 text-sm font-bold text-ink">Questions IA — 14 derniers jours</p>
        {stats.daily.length ? (
          <div className="divide-y divide-line">
            {stats.daily.map((d) => (
              <div key={d.jour} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-24 shrink-0 text-muted">
                  {new Date(d.jour).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                </span>
                <span className="w-24 shrink-0 font-semibold text-ink">{d.questions} question(s)</span>
                <span className="w-20 shrink-0 text-xs text-muted">{usd(d.cout_usd)}</span>
                <span className="h-2 rounded-full bg-ink/80" style={{ width: `${Math.min(100, d.questions * 4)}px` }} />
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-muted">Aucune question IA pour l&apos;instant.</p>
        )}
      </div>

      <p className="mt-3 text-xs text-muted">
        Total messages élèves (salutations et FAQ comprises) : {stats.msgs_total.toLocaleString('fr-FR')}.
        Les salutations et réponses FAQ sont gratuites et n&apos;apparaissent pas dans le coût.
      </p>
    </>
  );
}

/* ---------- Onglet FAQ ---------- */
function FaqTab({
  faq,
  onError,
  onChange,
}: {
  faq: Faq[];
  onError: (m: string | null) => void;
  onChange: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  async function add() {
    if (!question.trim() || !answer.trim()) return;
    setBusy(true);
    onError(null);
    const { error } = await supabase
      .from('coach_faq')
      .insert({ question: question.trim(), answer: answer.trim() });
    setBusy(false);
    if (error) return onError(error.message);
    setQuestion('');
    setAnswer('');
    onChange();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette question/réponse ?')) return;
    const { error } = await supabase.from('coach_faq').delete().eq('id', id);
    if (error) return onError(error.message);
    onChange();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div>
        {faq.length ? (
          <div className="card divide-y divide-line overflow-hidden">
            {faq.map((f) => (
              <div key={f.id}>
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => setOpen(open === f.id ? null : f.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold text-ink">{f.question}</p>
                    <p className="truncate text-xs text-muted">{f.answer}</p>
                  </button>
                  <button
                    onClick={() => remove(f.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
                    aria-label="Supprimer"
                  >
                    <IconX width={16} height={16} />
                  </button>
                </div>
                {open === f.id && (
                  <p className="whitespace-pre-line border-t border-line bg-black/[0.02] px-4 py-3 text-xs leading-relaxed text-muted">
                    {f.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-muted">Aucune question/réponse pour l&apos;instant.</div>
        )}
      </div>

      <div>
        <div className="card p-5 lg:sticky lg:top-[150px]">
          <h2 className="font-bold text-ink">Ajouter une Q/R</h2>
          <p className="mb-4 mt-1 text-xs text-muted">
            Mets plusieurs formulations dans la question (ex. « Comment payer ? Où régler mon échéance ? ») pour
            que l&apos;IA la retrouve facilement. La réponse peut contenir du gras (**texte**) et des liens.
          </p>
          <div className="space-y-3">
            <textarea
              className="input min-h-[70px]"
              placeholder="Question(s) type des élèves"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <textarea
              className="input min-h-[140px]"
              placeholder="La réponse de Roméo, servie telle quelle"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <button
              onClick={add}
              disabled={busy || !question.trim() || !answer.trim()}
              className="btn-primary w-full disabled:opacity-60"
            >
              <IconPlus width={17} height={17} /> {busy ? 'Ajout…' : 'Ajouter la Q/R'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Onglet Contenus ---------- */
function ContenusTab({
  items,
  onError,
  onChange,
}: {
  items: Knowledge[];
  onError: (m: string | null) => void;
  onChange: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  async function add() {
    if (!title.trim() || !content.trim()) return;
    setBusy(true);
    onError(null);
    const { error } = await supabase
      .from('coach_knowledge')
      .insert({ title: title.trim(), content: content.trim() });
    setBusy(false);
    if (error) return onError(error.message);
    setTitle('');
    setContent('');
    onChange();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce contenu du cerveau du Super Coach ?')) return;
    const { error } = await supabase.from('coach_knowledge').delete().eq('id', id);
    if (error) return onError(error.message);
    onChange();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div>
        {items.length ? (
          <div className="card divide-y divide-line overflow-hidden">
            {items.map((k) => (
              <div key={k.id}>
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => setOpen(open === k.id ? null : k.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold text-ink">{k.title}</p>
                    <p className="text-xs text-muted">
                      {k.content.length.toLocaleString('fr-FR')} caractères ·{' '}
                      {new Date(k.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </button>
                  <button
                    onClick={() => remove(k.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
                    aria-label="Supprimer"
                  >
                    <IconX width={16} height={16} />
                  </button>
                </div>
                {open === k.id && (
                  <p className="max-h-64 overflow-y-auto whitespace-pre-line border-t border-line bg-black/[0.02] px-4 py-3 text-xs leading-relaxed text-muted">
                    {k.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-muted">Aucun contenu pour l&apos;instant.</div>
        )}
      </div>

      <div>
        <div className="card p-5 lg:sticky lg:top-[150px]">
          <h2 className="font-bold text-ink">Ajouter un contenu</h2>
          <p className="mb-4 mt-1 text-xs text-muted">
            Un sujet par contenu (ex. « Méthode de prospection », « Transcript — Mindset chapitre 1 »).
            L&apos;IA en sert des extraits quand la question s&apos;y rapporte.
          </p>
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Titre du contenu"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="input min-h-[220px]"
              placeholder="Collez ici le transcript, la méthode, les conseils…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <button
              onClick={add}
              disabled={busy || !title.trim() || !content.trim()}
              className="btn-primary w-full disabled:opacity-60"
            >
              <IconPlus width={17} height={17} /> {busy ? 'Ajout…' : 'Ajouter au cerveau'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
