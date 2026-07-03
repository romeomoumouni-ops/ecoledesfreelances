'use client';

// Utilisateurs (admin) : deux onglets.
// « Membres » = comptes créés sur la plateforme (rôle admin attribuable).
// « Accès donnés » = e-mails autorisés par un paiement Chariow : recherche,
// correction d'un e-mail mal saisi à l'achat, révocation d'accès.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { setUserAdmin } from '@/lib/admin-actions';
import Avatar from '@/components/Avatar';
import { Badge } from '@/components/UI';
import { IconPen, IconX, IconCheck, IconPlus } from '@/components/Icons';
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
        <MembresList meId={meId} list={membresFiltres} />
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
function MembresList({ meId, list }: { meId: string; list: Membre[] }) {
  if (!list.length)
    return <div className="card p-10 text-center text-sm text-muted">Aucun membre ne correspond.</div>;
  return (
    <div className="card divide-y divide-line overflow-hidden">
      {list.map((u) => {
        const isSelf = u.id === meId;
        return (
          <div key={u.id} className="flex items-center gap-3 p-4">
            <Avatar initials={initials(u.full_name, u.email)} src={u.avatar_url} size={40} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate font-semibold text-ink">
                {u.full_name || u.email}
                {u.is_admin && <Badge>Admin</Badge>}
              </p>
              <p className="truncate text-xs text-muted">{u.email}</p>
            </div>
            {isSelf ? (
              <span className="text-xs text-muted">Vous</span>
            ) : (
              <form action={setUserAdmin.bind(null, u.id, !u.is_admin)}>
                <button className={u.is_admin ? 'btn-outline' : 'btn-primary'}>
                  {u.is_admin ? 'Retirer admin' : 'Rendre admin'}
                </button>
              </form>
            )}
          </div>
        );
      })}
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
    const { error } = await supabase.from('allowed_emails').insert({ email: v, source: 'manual', product: 'manuel' });
    setBusy(false);
    if (error) return onError(new Error(error.message));
    setInfo(
      dejaAcheteurs.some((a) => a.email === v)
        ? `Accès manuel donné à ${v} (note : cette personne a déjà un accès par paiement).`
        : `Accès donné à ${v}. La personne peut maintenant créer son compte avec cet e-mail.`
    );
    setTimeout(() => setInfo(null), 8000);
    setEmail('');
    onChange();
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
