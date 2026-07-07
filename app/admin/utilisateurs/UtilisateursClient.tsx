'use client';

// Utilisateurs (admin) : deux onglets.
// « Membres » = comptes créés sur la plateforme (rôle admin attribuable).
// « Accès donnés » = e-mails autorisés par un paiement Chariow : recherche,
// correction d'un e-mail mal saisi à l'achat, révocation d'accès.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { setUserAdmin } from '@/lib/admin-actions';
import Avatar from '@/components/Avatar';
import { Badge } from '@/components/UI';
import { IconPen, IconX, IconCheck, IconPlus, IconChevronRight, IconSparkle } from '@/components/Icons';
import RichText from '@/components/RichText';
import type { Membre, AccesDonne, AccesManuel } from './page';

const supabase = createClient();

const PLAN_LABEL: Record<string, string> = {
  '1x': '1 fois',
  '3x': '3 fois',
  '6x': '6 fois',
};

function initials(name: string | null, email: string | null) {
  const b = name || email || 'M';
  return b.split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function dateFr(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatutChip({ a }: { a: AccesDonne }) {
  if (a.access_until === null) return <span className="chip bg-ink text-white">À vie</span>;
  if (new Date(a.access_until).getTime() > Date.now())
    return <span className="chip border border-line bg-white text-ink">Actif jusqu&apos;au {dateFr(a.access_until)}</span>;
  return <span className="chip bg-red-50 text-red-600">Expiré</span>;
}

export default function UtilisateursClient({
  meId,
  membres,
  acces,
  manuels,
}: {
  meId: string;
  membres: Membre[];
  acces: AccesDonne[];
  manuels: AccesManuel[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'membres' | 'acces' | 'manuels'>('membres');
  const [query, setQuery] = useState('');
  const [err, setErr] = useState<string | null>(null);

  function fail(e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const jolis: Record<string, string> = {
      deja_utilise: 'Cet e-mail a déjà un accès.',
      email_invalide: 'Adresse e-mail invalide.',
      introuvable: 'Accès introuvable.',
    };
    setErr(jolis[msg] ?? Object.entries(jolis).find(([k]) => msg.includes(k))?.[1] ?? msg);
    setTimeout(() => setErr(null), 6000);
  }

  const q = query.trim().toLowerCase();
  const membresFiltres = useMemo(
    () =>
      membres.filter(
        (m) => !q || (m.email ?? '').toLowerCase().includes(q) || (m.full_name ?? '').toLowerCase().includes(q)
      ),
    [membres, q]
  );
  const accesFiltres = useMemo(() => acces.filter((a) => !q || a.email.includes(q)), [acces, q]);
  const manuelsFiltres = useMemo(
    () => manuels.filter((m) => !q || m.email.toLowerCase().includes(q)),
    [manuels, q]
  );

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-ink">Utilisateurs</h1>
      <p className="mb-4 text-sm text-muted">
        Les membres inscrits sur la plateforme, et les accès donnés par les paiements Chariow.
      </p>

      {/* Onglets */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('membres')}
          className={`chip px-4 py-2.5 text-sm transition ${
            tab === 'membres' ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'
          }`}
        >
          Membres ({membres.length.toLocaleString('fr-FR')})
        </button>
        <button
          onClick={() => setTab('acces')}
          className={`chip px-4 py-2.5 text-sm transition ${
            tab === 'acces' ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'
          }`}
        >
          Accès donnés ({acces.length.toLocaleString('fr-FR')})
        </button>
        <button
          onClick={() => setTab('manuels')}
          className={`chip px-4 py-2.5 text-sm transition ${
            tab === 'manuels' ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'
          }`}
        >
          Donner un accès manuellement ({manuels.length.toLocaleString('fr-FR')})
        </button>
      </div>

      {err && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input mb-4 max-w-sm"
        placeholder={tab === 'membres' ? 'Rechercher un membre…' : 'Rechercher un e-mail…'}
      />

      {tab === 'membres' ? (
        <MembresList meId={meId} list={membresFiltres} onError={fail} onChange={() => router.refresh()} />
      ) : tab === 'acces' ? (
        <AccesList list={accesFiltres} onError={fail} onChange={() => router.refresh()} />
      ) : (
        <ManuelsList
          list={manuelsFiltres}
          dejaAcheteurs={acces}
          onError={fail}
          onChange={() => router.refresh()}
        />
      )}
    </>
  );
}

/* ---------- Onglet Membres ---------- */
function MembresList({
  meId,
  list,
  onError,
  onChange,
}: {
  meId: string;
  list: Membre[];
  onError: (e: unknown) => void;
  onChange: () => void;
}) {
  const [detail, setDetail] = useState<Membre | null>(null);

  async function toggleBan(u: Membre) {
    const next = !u.banned;
    if (next && !confirm(`Bannir ${u.full_name || u.email} ?\n\nLa personne sera immédiatement bloquée : elle ne pourra plus accéder à la plateforme (son compte et son historique sont conservés). Tu pourras la débannir à tout moment.`)) return;
    const { error } = await supabase.from('profiles').update({ banned: next }).eq('id', u.id);
    if (error) return onError(new Error(error.message));
    onChange();
  }

  if (!list.length)
    return <div className="card p-10 text-center text-sm text-muted">Aucun membre ne correspond.</div>;

  return (
    <>
      <div className="card divide-y divide-line overflow-hidden">
        {list.map((u) => {
          const isSelf = u.id === meId;
          return (
            <div key={u.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
              <button onClick={() => setDetail(u)} className="flex min-w-0 flex-1 items-center gap-3 text-left" title="Voir l'historique">
                <Avatar initials={initials(u.full_name, u.email)} src={u.avatar_url} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 truncate font-semibold text-ink">
                    {u.full_name || u.email}
                    {u.is_admin && <Badge>Admin</Badge>}
                    {u.banned && (
                      <span className="chip bg-red-50 text-red-600">Banni</span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted">{u.email}</span>
                </span>
                <IconChevronRight width={16} height={16} className="shrink-0 text-muted" />
              </button>
              {isSelf ? (
                <span className="text-xs text-muted">Vous</span>
              ) : (
                <div className="flex items-center gap-2">
                  <form action={setUserAdmin.bind(null, u.id, !u.is_admin)}>
                    <button className="btn-outline text-xs">{u.is_admin ? 'Retirer admin' : 'Rendre admin'}</button>
                  </form>
                  <button
                    onClick={() => toggleBan(u)}
                    className={
                      u.banned
                        ? 'rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-black/[0.03]'
                        : 'rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100'
                    }
                  >
                    {u.banned ? 'Débannir' : 'Bannir'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {detail && <UserDetailModal membre={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

/* ---------- Fiche utilisateur : infos + historique d'action ---------- */
type UserProfile = {
  info: {
    created_at: string | null;
    last_sign_in_at: string | null;
    access: { active?: boolean; reason?: string; plan?: string; access_until?: string | null } | null;
    devices: number;
    counts: Record<string, number>;
  };
  activity: { typ: string; label: string; detail: string | null; at: string }[];
};

const ACT_ICON: Record<string, string> = {
  super_coach: '✦',
  comment: '💬',
  post: '📣',
  coach: '📨',
  suivi: '🗓️',
  task: '✅',
  video: '▶️',
};

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function UserDetailModal({ membre, onClose }: { membre: Membre; onClose: () => void }) {
  const [data, setData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    supabase.rpc('admin_user_profile', { p_user: membre.id }).then(({ data }) => {
      if (active) {
        const d = (data ?? null) as UserProfile | null;
        setData(d);
        setDevices(d?.info.devices ?? 0);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [membre.id]);

  async function resetDevices() {
    if (!confirm(`Réinitialiser les appareils de ${membre.full_name || membre.email} ?\n\nToutes ses connexions seront oubliées : il pourra se reconnecter sur ses appareils (utile s'il a changé de téléphone).`)) return;
    const { error } = await supabase.rpc('admin_reset_devices', { p_user: membre.id });
    if (!error) setDevices(0);
  }

  const counts = data?.info.counts ?? {};
  const acc = data?.info.access;
  const accLabel = !acc?.active
    ? acc?.reason === 'expired'
      ? 'Expiré'
      : acc?.reason === 'banned'
      ? 'Banni'
      : 'Aucun accès'
    : acc.reason === 'admin'
    ? 'Admin'
    : acc.reason === 'manual'
    ? 'Accès manuel'
    : acc.plan
    ? `Payé (${acc.plan})`
    : 'Actif';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center gap-3 border-b border-line bg-white p-4">
          <Avatar initials={initials(membre.full_name, membre.email)} src={membre.avatar_url} size={40} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 truncate font-bold text-ink">
              {membre.full_name || membre.email}
              {membre.banned && <span className="chip bg-red-50 text-red-600">Banni</span>}
            </p>
            <p className="truncate text-xs text-muted">{membre.email}</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-black/[0.05]" aria-label="Fermer">
            <IconX width={18} height={18} />
          </button>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-muted">Chargement…</p>
        ) : (
          <div className="p-4">
            {/* Infos */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-black/[0.03] p-3">
                <p className="text-xs text-muted">Accès</p>
                <p className="font-semibold text-ink">{accLabel}</p>
              </div>
              <div className="rounded-lg bg-black/[0.03] p-3">
                <p className="text-xs text-muted">Dernière connexion</p>
                <p className="font-semibold text-ink">{fmtDateTime(data?.info.last_sign_in_at ?? null)}</p>
              </div>
              <div className="rounded-lg bg-black/[0.03] p-3">
                <p className="text-xs text-muted">Inscrit le</p>
                <p className="font-semibold text-ink">{fmtDateTime(data?.info.created_at ?? null)}</p>
              </div>
              <div className="rounded-lg bg-black/[0.03] p-3">
                <p className="text-xs text-muted">Appareils connectés</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{devices ?? 0} / 3</p>
                  {(devices ?? 0) > 0 && (
                    <button onClick={resetDevices} className="text-xs font-semibold text-red-600 hover:underline">
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Compteurs d'activité */}
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ['super_coach', 'questions Super Coach', <IconSparkle key="s" width={13} height={13} />],
                ['videos', 'vidéos vues'],
                ['tasks', 'tâches objectif'],
                ['comments', 'commentaires'],
                ['posts', 'publications'],
                ['coach_msgs', 'msgs coachs'],
                ['suivi_msgs', 'msgs suivi'],
              ].map(([key, label, icon]) => (
                <span key={key as string} className="chip border border-line bg-white text-muted">
                  {icon as React.ReactNode}
                  <b className="text-ink">{counts[key as string] ?? 0}</b> {label as string}
                </span>
              ))}
            </div>

            {/* Historique */}
            <p className="mb-2 mt-5 text-sm font-bold text-ink">Historique d&apos;action</p>
            {data?.activity.length ? (
              <div className="space-y-1.5">
                {data.activity.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg bg-black/[0.02] px-3 py-2">
                    <span className="mt-0.5 shrink-0 text-sm">{ACT_ICON[a.typ] ?? '•'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{a.label}</p>
                      {a.detail && (
                        <p className="truncate text-xs text-muted">
                          <RichText text={a.detail} />
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted">{fmtDateTime(a.at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted">Aucune action enregistrée.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Onglet Donner un accès manuellement ---------- */
function ManuelsList({
  list,
  dejaAcheteurs,
  onError,
  onChange,
}: {
  list: AccesManuel[];
  dejaAcheteurs: AccesDonne[];
  onError: (e: unknown) => void;
  onChange: () => void;
}) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function give() {
    const v = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return onError(new Error('Adresse e-mail invalide.'));
    if (list.some((m) => m.email.toLowerCase() === v)) return onError(new Error('Cet e-mail a déjà un accès manuel.'));
    setBusy(true);
    // Route serveur : ajoute l'accès ET envoie l'e-mail de bienvenue (comme les acheteurs)
    try {
      const res = await fetch('/api/admin/manual-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? 'Échec de l’ajout.');
      setInfo(
        j?.already
          ? `${v} avait déjà un accès manuel — rien n'a été modifié (aucun e-mail renvoyé).`
          : dejaAcheteurs.some((a) => a.email === v)
          ? `Accès manuel donné à ${v} (note : cette personne a déjà un accès par paiement). E-mail de bienvenue envoyé.`
          : `Accès donné à ${v}. E-mail de bienvenue envoyé. La personne peut créer son compte avec cet e-mail.`
      );
      setTimeout(() => setInfo(null), 8000);
      setEmail('');
      onChange();
    } catch (e) {
      onError(e instanceof Error ? e : new Error('Échec de l’ajout.'));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(v: string) {
    if (!confirm(`Retirer l'accès manuel de ${v} ?`)) return;
    const { error } = await supabase.from('allowed_emails').delete().eq('email', v);
    if (error) return onError(new Error(error.message));
    onChange();
  }

  return (
    <>
      {/* Donner un accès */}
      <div className="card mb-4 p-4">
        <p className="font-semibold text-ink">Donner un accès</p>
        <p className="mb-3 mt-0.5 text-xs text-muted">
          La personne pourra créer son compte et accéder à la plateforme avec cet e-mail, sans paiement.
          L&apos;accès reste valable tant qu&apos;il n&apos;est pas retiré.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && give()}
            className="input sm:max-w-sm"
            placeholder="email@exemple.com"
          />
          <button onClick={give} disabled={busy || !email.trim()} className="btn-primary disabled:opacity-60">
            <IconPlus width={17} height={17} /> {busy ? 'Ajout…' : "Donner l'accès"}
          </button>
        </div>
        {info && <p className="mt-3 rounded-lg bg-black/[0.04] px-3 py-2 text-sm text-ink">{info}</p>}
      </div>

      {/* Liste des accès manuels */}
      {list.length ? (
        <div className="card divide-y divide-line overflow-hidden">
          {list.map((m) => (
            <div key={m.email} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{m.email}</p>
                <p className="text-xs text-muted">
                  {m.source === 'grandfather' ? 'Compte historique' : 'Accès manuel'} · donné le {dateFr(m.created_at)}
                </p>
              </div>
              <span className="chip border border-line bg-white text-ink">Accès actif</span>
              <button
                onClick={() => revoke(m.email)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
                aria-label="Retirer l'accès"
                title="Retirer l'accès"
              >
                <IconX width={16} height={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center text-sm text-muted">Aucun accès manuel ne correspond.</div>
      )}
    </>
  );
}

/* ---------- Onglet Accès donnés ---------- */
function AccesList({
  list,
  onError,
  onChange,
}: {
  list: AccesDonne[];
  onError: (e: unknown) => void;
  onChange: () => void;
}) {
  if (!list.length)
    return <div className="card p-10 text-center text-sm text-muted">Aucun accès ne correspond.</div>;
  return (
    <>
      <div className="card divide-y divide-line overflow-hidden">
        {list.slice(0, 200).map((a) => (
          <AccesRow key={a.email} acces={a} onError={onError} onChange={onChange} />
        ))}
      </div>
      {list.length > 200 && (
        <p className="mt-3 text-center text-xs text-muted">
          {list.length.toLocaleString('fr-FR')} résultats — affinez la recherche pour voir le reste (200 affichés).
        </p>
      )}
    </>
  );
}

function AccesRow({
  acces: a,
  onError,
  onChange,
}: {
  acces: AccesDonne;
  onError: (e: unknown) => void;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(a.email);
  const [busy, setBusy] = useState(false);

  async function saveEmail() {
    const next = email.trim().toLowerCase();
    if (!next || next === a.email) return setEditing(false);
    setBusy(true);
    const { error } = await supabase.rpc('admin_fix_grant_email', { p_old: a.email, p_new: next });
    setBusy(false);
    if (error) {
      setEmail(a.email);
      return onError(new Error(error.message));
    }
    setEditing(false);
    onChange();
  }

  async function revoke() {
    if (!confirm(`Révoquer l'accès de ${a.email} ?\n\nLa personne ne pourra plus entrer sur la plateforme (son historique de paiement est conservé).`)) return;
    setBusy(true);
    const { error } = await supabase.from('access_grants').delete().eq('email', a.email);
    setBusy(false);
    if (error) return onError(new Error(error.message));
    onChange();
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-4">
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveEmail()}
              className="input max-w-xs py-1.5 text-sm"
              autoFocus
            />
            <button onClick={saveEmail} disabled={busy} className="grid h-8 w-8 place-items-center rounded-lg text-ink hover:bg-black/[0.05]" aria-label="Enregistrer" title="Enregistrer">
              <IconCheck width={16} height={16} />
            </button>
            <button onClick={() => { setEditing(false); setEmail(a.email); }} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-black/[0.05]" aria-label="Annuler" title="Annuler">
              <IconX width={16} height={16} />
            </button>
          </div>
        ) : (
          <p className="truncate text-sm font-semibold text-ink">{a.email}</p>
        )}
        <p className="text-xs text-muted">
          Paiement en {PLAN_LABEL[a.plan] ?? a.plan} · {Math.min(a.payments_count, a.total_payments)}/{a.total_payments} échéance(s)
        </p>
      </div>
      <StatutChip a={a} />
      {!editing && (
        <>
          <button
            onClick={() => setEditing(true)}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-black/[0.05] hover:text-ink"
            aria-label="Corriger l'e-mail"
            title="Corriger l'e-mail (mal saisi à l'achat)"
          >
            <IconPen width={15} height={15} />
          </button>
          <button
            onClick={revoke}
            disabled={busy}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
            aria-label="Révoquer l'accès"
            title="Révoquer l'accès"
          >
            <IconX width={16} height={16} />
          </button>
        </>
      )}
    </div>
  );
}
