'use client';

// Bible de lancement : la checklist complète à cocher AVANT de lancer les
// publicités. Chaque case se sauvegarde toute seule ; la progression avance en
// direct ; le bouton « Lancer les publicités » ne se déverrouille qu'à 100 %.

import { useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LaunchRun } from './page';
import { IconCheckCircle, IconLock, IconTarget, IconX } from '@/components/Icons';

const supabase = createClient();

/* ------------------------------------------------------------------ */
/* La checklist. Pour ajouter / retirer une étape plus tard : modifier */
/* cette liste, rien d'autre. Les clés doivent rester stables.        */
/* ------------------------------------------------------------------ */

type Item = { key: string; label: string; hint?: string };
type Section = { title: string; emoji: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: 'SendFlow — Campagne',
    emoji: '📲',
    items: [
      { key: 'sf_dupliquer', label: 'Dupliquer la campagne précédente' },
      { key: 'sf_date', label: 'Changer la date de la campagne' },
      {
        key: 'sf_groupes',
        label: 'Créer les 8 groupes en avance',
        hint: 'Limite : 800 personnes par communauté.',
      },
      {
        key: 'sf_messages',
        label: 'Vérifier tous les messages programmés',
        hint: 'Contenu, ordre, horaires — messages dupliqués avec la bonne date.',
      },
      {
        key: 'sf_liens',
        label: 'Vérifier les liens dans les messages',
        hint: 'Chaque lien doit pointer vers la NOUVELLE campagne, pas l’ancienne.',
      },
    ],
  },
  {
    title: 'Systeme.io — Page d’opt-in',
    emoji: '🎯',
    items: [
      { key: 'sio_code', label: 'Changer le code webinaire sur la page d’opt-in' },
      {
        key: 'sio_test',
        label: 'Tester une inscription de bout en bout',
        hint: 'S’inscrire soi-même : opt-in → redirection → arrivée au bon endroit.',
      },
    ],
  },
  {
    title: 'Page d’atterrissage',
    emoji: '🛬',
    items: [
      {
        key: 'land_boutons',
        label: 'Mettre le lien de la nouvelle campagne SendFlow derrière les DEUX boutons',
      },
      {
        key: 'land_test',
        label: 'Cliquer les deux boutons pour vérifier la redirection',
        hint: 'Les deux doivent envoyer vers la nouvelle campagne, pas l’ancienne.',
      },
    ],
  },
  {
    title: 'Communautés WhatsApp',
    emoji: '👥',
    items: [
      { key: 'com_pretes', label: 'Les 8 communautés sont créées et prêtes' },
      {
        key: 'com_marianne',
        label: 'Lien envoyé à Marianne pour l’ajout des administrateurs',
      },
      {
        key: 'com_admins',
        label: 'Tous les administrateurs sont présents dans chacune des 8 communautés',
        hint: 'À vérifier une par une avant de cocher.',
      },
    ],
  },
  {
    title: 'Vérifications finales',
    emoji: '✅',
    items: [
      {
        key: 'fin_parcours',
        label: 'Parcours complet testé comme un prospect',
        hint: 'Page d’atterrissage → opt-in → communauté : tout s’enchaîne sans accroc.',
      },
      { key: 'fin_equipe', label: 'Équipe prévenue de la date et des horaires du lancement' },
    ],
  },
];

const ALL_KEYS = SECTIONS.flatMap((s) => s.items.map((i) => i.key));

/* ------------------------------------------------------------------ */

function titreParDefaut(): string {
  const d = new Date();
  return `Lancement du ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

function dateFr(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function LancementClient({ runs: initialRuns }: { runs: LaunchRun[] }) {
  const [runs, setRuns] = useState<LaunchRun[]>(initialRuns);
  const [currentId, setCurrentId] = useState<string | null>(
    // Par défaut : le lancement en cours (pubs pas encore lancées), sinon le plus récent
    initialRuns.find((r) => !r.ads_launched_at)?.id ?? initialRuns[0]?.id ?? null
  );
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = runs.find((r) => r.id === currentId) ?? null;

  const done = useMemo(() => (run ? ALL_KEYS.filter((k) => run.checks[k]).length : 0), [run]);
  const pct = Math.round((done / ALL_KEYS.length) * 100);
  const complete = done === ALL_KEYS.length;

  async function nouveauLancement() {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase
      .from('launch_runs')
      .insert({ title: titreParDefaut() })
      .select('*')
      .single();
    setBusy(false);
    if (error || !data) return setErr("Impossible de créer le lancement. Réessaie.");
    setRuns((rs) => [data as LaunchRun, ...rs]);
    setCurrentId((data as LaunchRun).id);
  }

  async function toggle(key: string) {
    if (!run) return;
    const next = { ...run.checks, [key]: !run.checks[key] };
    if (!next[key]) delete next[key];
    // Optimiste : la case répond immédiatement, la sauvegarde suit.
    setRuns((rs) => rs.map((r) => (r.id === run.id ? { ...r, checks: next } : r)));
    const { error } = await supabase.from('launch_runs').update({ checks: next, updated_at: new Date().toISOString() }).eq('id', run.id);
    if (error) {
      setRuns((rs) => rs.map((r) => (r.id === run.id ? { ...r, checks: run.checks } : r)));
      setErr('La sauvegarde a échoué. Vérifie ta connexion et recoche.');
    } else {
      setErr(null);
    }
  }

  function saveNotes(text: string) {
    if (!run) return;
    setRuns((rs) => rs.map((r) => (r.id === run.id ? { ...r, notes: text } : r)));
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      void supabase.from('launch_runs').update({ notes: text, updated_at: new Date().toISOString() }).eq('id', run.id);
    }, 600);
  }

  async function renommer() {
    if (!run) return;
    const t = prompt('Nom du lancement :', run.title);
    if (!t || !t.trim()) return;
    setRuns((rs) => rs.map((r) => (r.id === run.id ? { ...r, title: t.trim() } : r)));
    await supabase.from('launch_runs').update({ title: t.trim() }).eq('id', run.id);
  }

  async function supprimer() {
    if (!run) return;
    if (!confirm(`Supprimer « ${run.title} » et ses cases cochées ?`)) return;
    await supabase.from('launch_runs').delete().eq('id', run.id);
    setRuns((rs) => {
      const rest = rs.filter((r) => r.id !== run.id);
      setCurrentId(rest[0]?.id ?? null);
      return rest;
    });
  }

  async function declarerPubsLancees() {
    if (!run || !complete) return;
    if (!confirm('Confirmer : les publicités sont lancées pour ce lancement ?')) return;
    const now = new Date().toISOString();
    setRuns((rs) => rs.map((r) => (r.id === run.id ? { ...r, ads_launched_at: now } : r)));
    await supabase.from('launch_runs').update({ ads_launched_at: now }).eq('id', run.id);
  }

  return (
    <>
      <div className="mb-1 flex items-center gap-2">
        <IconTarget width={20} height={20} className="text-ink" />
        <h1 className="text-xl font-bold text-ink">Bible de lancement</h1>
      </div>
      <p className="mb-5 text-sm text-muted">
        Coche chaque étape au fur et à mesure — tout se sauvegarde tout seul. Les publicités ne se
        lancent <b className="text-ink">jamais</b> avant le 100&nbsp;%.
      </p>

      {err && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      {/* Choix du lancement + nouveau */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button onClick={nouveauLancement} disabled={busy} className="btn-primary">
          + Nouveau lancement
        </button>
        {runs.map((r) => {
          const rDone = ALL_KEYS.filter((k) => r.checks[k]).length;
          const on = r.id === currentId;
          return (
            <button
              key={r.id}
              onClick={() => setCurrentId(r.id)}
              className={`chip gap-2 px-4 py-2.5 text-sm transition ${
                on ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'
              }`}
            >
              {r.ads_launched_at ? '🚀' : rDone === ALL_KEYS.length ? '🟢' : ''} {r.title}
              <span className={on ? 'text-white/60' : 'text-muted/70'}>
                {rDone}/{ALL_KEYS.length}
              </span>
            </button>
          );
        })}
      </div>

      {!run ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-muted">
            Aucun lancement pour l&apos;instant. Crée ton premier avec «&nbsp;+ Nouveau lancement&nbsp;».
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* -------- Colonne principale : la checklist -------- */}
          <div className="min-w-0">
            {/* Progression */}
            <div className="card mb-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{run.title}</p>
                  <p className="text-xs text-muted">
                    Créé le {dateFr(run.created_at)}
                    {run.ads_launched_at && <> · pubs lancées le {dateFr(run.ads_launched_at)}</>}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={renommer} className="chip border border-line bg-white px-3 py-1.5 text-xs text-muted hover:text-ink">
                    Renommer
                  </button>
                  <button onClick={supprimer} className="chip border border-line bg-white px-3 py-1.5 text-xs text-muted hover:text-red-600">
                    <IconX width={12} height={12} /> Supprimer
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${complete ? 'bg-emerald-500' : 'bg-ink'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`shrink-0 text-sm font-bold tabular-nums ${complete ? 'text-emerald-600' : 'text-ink'}`}>
                  {pct}%
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {done}/{ALL_KEYS.length} étapes faites
                {!complete && <> — encore {ALL_KEYS.length - done} avant de pouvoir lancer les pubs</>}
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-4">
              {SECTIONS.map((s) => {
                const sDone = s.items.filter((i) => run.checks[i.key]).length;
                const sComplete = sDone === s.items.length;
                return (
                  <div key={s.title} className="card overflow-hidden">
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                      <p className="text-sm font-bold text-ink">
                        {s.emoji} {s.title}
                      </p>
                      <span className={`chip px-2.5 py-1 text-xs ${sComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-black/[0.04] text-muted'}`}>
                        {sDone}/{s.items.length}
                      </span>
                    </div>
                    <div className="divide-y divide-line">
                      {s.items.map((it) => {
                        const on = !!run.checks[it.key];
                        return (
                          <label
                            key={it.key}
                            className={`flex cursor-pointer items-start gap-3 px-4 py-3.5 transition hover:bg-black/[0.015] ${on ? 'bg-emerald-50/40' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggle(it.key)}
                              className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600"
                            />
                            <span className="min-w-0">
                              <span className={`block text-sm font-medium ${on ? 'text-muted line-through decoration-emerald-600/40' : 'text-ink'}`}>
                                {it.label}
                              </span>
                              {it.hint && <span className="mt-0.5 block text-xs text-muted">{it.hint}</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* -------- Colonne latérale : feu vert + notes -------- */}
          <div className="space-y-4">
            {/* Le feu vert */}
            <div className={`card overflow-hidden ${complete ? '' : 'opacity-95'}`}>
              {run.ads_launched_at ? (
                <div className="bg-ink p-5 text-center text-white">
                  <p className="text-3xl">🚀</p>
                  <p className="mt-2 text-sm font-bold">Publicités lancées</p>
                  <p className="mt-1 text-xs text-white/60">le {dateFr(run.ads_launched_at)} — bon lancement !</p>
                </div>
              ) : complete ? (
                <div className="bg-emerald-600 p-5 text-center text-white">
                  <p className="text-3xl">🟢</p>
                  <p className="mt-2 text-sm font-bold">Tout est prêt !</p>
                  <p className="mx-auto mt-1 max-w-[230px] text-xs text-white/85">
                    Les {ALL_KEYS.length} étapes sont cochées. Tu peux lancer les publicités l&apos;esprit tranquille.
                  </p>
                  <button
                    onClick={declarerPubsLancees}
                    className="mx-auto mt-4 block rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    J&apos;ai lancé les publicités ✓
                  </button>
                </div>
              ) : (
                <div className="p-5 text-center">
                  <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-black/[0.05] text-muted">
                    <IconLock width={20} height={20} />
                  </span>
                  <p className="mt-3 text-sm font-bold text-ink">Publicités verrouillées</p>
                  <p className="mx-auto mt-1 max-w-[230px] text-xs leading-relaxed text-muted">
                    Termine les {ALL_KEYS.length - done} étape(s) restante(s) pour déverrouiller le lancement.
                  </p>
                </div>
              )}
            </div>

            {/* Ce qu'il reste */}
            {!complete && !run.ads_launched_at && (
              <div className="card p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Il reste à faire</p>
                <ul className="space-y-1.5">
                  {SECTIONS.flatMap((s) => s.items)
                    .filter((i) => !run.checks[i.key])
                    .slice(0, 6)
                    .map((i) => (
                      <li key={i.key} className="flex items-start gap-2 text-xs text-ink">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        {i.label}
                      </li>
                    ))}
                </ul>
              </div>
            )}
            {complete && !run.ads_launched_at && (
              <div className="card flex items-center gap-2 p-4 text-sm text-emerald-700">
                <IconCheckCircle width={16} height={16} /> Rien d&apos;oublié. Zéro stress.
              </div>
            )}

            {/* Notes */}
            <div className="card p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Notes du lancement</p>
              <textarea
                value={run.notes ?? ''}
                onChange={(e) => saveNotes(e.target.value)}
                rows={5}
                placeholder="Code webinaire, dates, liens, choses à ne pas oublier la prochaine fois…"
                className="input w-full resize-y text-sm"
              />
              <p className="mt-1 text-[11px] text-muted">Sauvegarde automatique.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
