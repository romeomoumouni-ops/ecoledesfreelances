'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import Avatar from '@/components/Avatar';
import RichText from '@/components/RichText';
import { CONTACTS, contactByKey } from '@/lib/coaches';
import { IconChat, IconChevronRight } from '@/components/Icons';

const supabase = createClient();

type Me = { id: string; name: string };
type Msg = {
  id: string;
  recipient: string;
  student_id: string;
  body: string;
  from_admin: boolean;
  sender_name: string | null;
  created_at: string;
  ai_generated?: boolean;
};
type Conv = {
  student_id: string;
  name: string;
  last_at: string;
  last_body: string;
  last_from_admin: boolean;
  unread: number;
};
const PAGE_SIZE = 10; // conversations par page (les plus récentes d'abord)

function initialsOf(name: string | null) {
  return (name || 'M').split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

const scopeOf = (coach: string, student: string) => `admincv:${coach}:${student}`;

export default function AdminMessagesClient({ me }: { me: Me }) {
  const router = useRouter();
  const [coach, setCoach] = useState(CONTACTS[0].key);
  // Conversations de la page courante (côté base : tri + regroupement + non-lus)
  const [convs, setConvs] = useState<Conv[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [unreadByCoach, setUnreadByCoach] = useState<Record<string, number>>({});
  // Fil ouvert : chargé à la demande, jamais tout d'un coup
  const [student, setStudent] = useState<string | null>(null);
  const [thread, setThread] = useState<Msg[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  // Pilote automatique (IA) par coach + taille de sa boîte de data
  const [pilots, setPilots] = useState<Record<string, boolean>>({});
  const [dataBox, setDataBox] = useState<{ n: number; chars: number }>({ n: 0, chars: 0 });
  const [pilotBusy, setPilotBusy] = useState(false);

  async function loadPage(coachKey: string, p: number) {
    setLoading(true);
    const [{ data: conv }, { data: unread }] = await Promise.all([
      supabase.rpc('admin_conversations', { p_coach: coachKey, p_page: p, p_size: PAGE_SIZE }),
      supabase.rpc('admin_unread_by_coach'),
    ]);
    const c = (conv ?? { total: 0, items: [] }) as { total: number; items: Conv[] };
    setConvs(c.items);
    setTotal(c.total);
    setUnreadByCoach((unread ?? {}) as Record<string, number>);
    setLoading(false);
  }

  async function loadSettings() {
    const [{ data: pl }, { data: kd }] = await Promise.all([
      supabase.from('coach_autopilot').select('coach_key, enabled'),
      supabase.from('coach_reply_data').select('chars'),
    ]);
    setPilots(Object.fromEntries((pl ?? []).map((p) => [p.coach_key, p.enabled])));
    // Boîte de data COMMUNE à tous les coachs
    setDataBox({ n: (kd ?? []).length, chars: (kd ?? []).reduce((s, k) => s + (k.chars ?? 0), 0) });
  }

  async function openThread(coachKey: string, studentId: string) {
    setStudent(studentId);
    setThreadLoading(true);
    const { data } = await supabase
      .from('support_messages')
      .select('id, recipient, student_id, body, from_admin, sender_name, created_at, ai_generated')
      .eq('recipient', coachKey)
      .eq('student_id', studentId)
      .eq('broadcast', false)
      .order('created_at', { ascending: true });
    setThread((data ?? []) as Msg[]);
    setThreadLoading(false);
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    void loadPage(coach, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach, page]);

  // Temps réel : un nouveau message (élève, coach ou IA) rafraîchit la page de
  // conversations et complète le fil ouvert s'il est concerné.
  useEffect(() => {
    void ensureRealtimeAuth();
    const channel = supabase
      .channel('admin-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          const m = payload.new as Msg & { broadcast?: boolean };
          if (m.broadcast) return; // envoi groupé : pas une conversation
          if (m.recipient === coach) void loadPage(coach, page);
          if (student && m.recipient === coach && m.student_id === student) {
            setThread((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach, page, student]);

  async function setAutopilot(coachKey: string, enabled: boolean) {
    setPilotBusy(true);
    const before = pilots[coachKey] ?? false;
    setPilots((p) => ({ ...p, [coachKey]: enabled }));
    const { error } = await supabase
      .from('coach_autopilot')
      .upsert({ coach_key: coachKey, enabled, updated_by: me.id, updated_at: new Date().toISOString() });
    if (error) setPilots((p) => ({ ...p, [coachKey]: before }));
    setPilotBusy(false);
  }

  async function markRead(coachKey: string, studentId: string) {
    await supabase.from('read_marks').upsert(
      { user_id: me.id, scope: scopeOf(coachKey, studentId), last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,scope' }
    );
    setConvs((cs) => cs.map((c) => (c.student_id === studentId ? { ...c, unread: 0 } : c)));
    const { data: unread } = await supabase.rpc('admin_unread_by_coach');
    setUnreadByCoach((unread ?? {}) as Record<string, number>);
    router.refresh(); // pastille du menu admin
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const studentName = student ? convs.find((c) => c.student_id === student)?.name ?? 'Élève' : '';

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-ink">Messagerie des coachs</h1>
      <p className="mb-4 text-sm text-muted">
        Les messages envoyés par les élèves, par coach. Tout admin peut lire et répondre. Mise à jour en temps réel.
      </p>

      {/* Onglets coachs (avec non-lus) */}
      <div className="scrollbar-hide mb-5 flex gap-2 overflow-x-auto pb-1">
        {CONTACTS.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              setCoach(c.key);
              setStudent(null);
              setPage(0);
            }}
            className={`chip shrink-0 gap-2 px-4 py-2.5 text-sm transition ${
              coach === c.key ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:bg-black/[0.03] hover:text-ink'
            }`}
          >
            {c.name}
            {unreadByCoach[c.key] ? (
              <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadByCoach[c.key] > 9 ? '9+' : unreadByCoach[c.key]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Pilote automatique + Boîte de data du coach sélectionné */}
      {!student && (
        <div className="card mb-5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-bold text-ink">
                {pilots[coach] ? '🤖 Pilote automatique activé' : '🧑‍🏫 Réponses manuelles'}
                <span className="text-xs font-normal text-muted">— {contactByKey(coach)?.name}</span>
              </p>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
                {pilots[coach]
                  ? "L'IA répond aux élèves à ta place, avec la boîte de data de l'équipe. Tu gardes la main : tes propres réponses passent toujours, et tu peux couper à tout moment."
                  : "Tu réponds toi-même à chaque message. Active le pilote automatique pour que l'IA réponde en ton nom, à partir de la boîte de data de l'équipe."}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <button
                onClick={() => setAutopilot(coach, true)}
                disabled={pilotBusy || !!pilots[coach]}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                  pilots[coach] ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-ink text-white hover:bg-black'
                } disabled:cursor-default`}
              >
                {pilots[coach] ? '✓ Pilote automatique' : 'Pilote automatique'}
              </button>
              <button
                onClick={() => setAutopilot(coach, false)}
                disabled={pilotBusy || !pilots[coach]}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                  !pilots[coach] ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-[#2f7bdc] text-white hover:bg-[#1f63c4]'
                } disabled:cursor-default`}
              >
                {!pilots[coach] ? '✓ Je réponds moi-même' : 'Je veux répondre moi-même'}
              </button>
            </div>
          </div>

          {/* Boîte de data */}
          <a
            href="/admin/data-reponses"
            className="mt-4 flex items-center gap-4 rounded-xl border border-dashed border-line p-3 transition hover:border-ink hover:bg-black/[0.015]"
          >
            <span className="relative grid h-12 w-14 shrink-0 place-items-center">
              <svg viewBox="0 0 56 44" width="56" height="44" fill="none" aria-hidden>
                <path d="M4 14h48v24a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V14Z" fill="#f3f3f1" stroke="#1d1d1f" strokeWidth="2" />
                <path d="M2 8a2 2 0 0 1 2-2h48a2 2 0 0 1 2 2v6H2V8Z" fill="#ffffff" stroke="#1d1d1f" strokeWidth="2" />
                <path d="M22 22h12" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {dataBox.n > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-ink px-1.5 text-[11px] font-bold text-white">
                  {dataBox.n}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink">Boîte de data <span className="font-normal text-muted">· commune à toute l&apos;équipe</span></span>
              <span className="block text-xs text-muted">
                {dataBox.n > 0
                  ? `${dataBox.n} élément(s) · ${Math.round(dataBox.chars / 1000)} k caractères — l'IA répond avec les mots de l'équipe.`
                  : "Vide pour l'instant : l'IA répond avec des conseils généraux. Ajoutez vos réponses types, vos PDF, vos pages."}
              </span>
            </span>
            <IconChevronRight width={16} height={16} className="shrink-0 text-muted" />
          </a>
        </div>
      )}

      {student ? (
        threadLoading ? (
          <p className="py-8 text-center text-sm text-muted">Chargement de la conversation…</p>
        ) : (
          <AdminThread
            me={me}
            coachKey={coach}
            studentId={student}
            studentName={studentName}
            thread={thread}
            onBack={() => setStudent(null)}
            onSent={(m) => setThread((all) => (all.some((x) => x.id === m.id) ? all : [...all, m]))}
          />
        )
      ) : loading && !convs.length ? (
        <p className="py-8 text-center text-sm text-muted">Chargement…</p>
      ) : convs.length ? (
        <>
          <div className={`card divide-y divide-line overflow-hidden transition-opacity ${loading ? 'opacity-50' : ''}`}>
            {convs.map((c) => (
              <button
                key={c.student_id}
                onClick={() => {
                  void openThread(coach, c.student_id);
                  void markRead(coach, c.student_id);
                }}
                className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-black/[0.02]"
              >
                <Avatar initials={initialsOf(c.name)} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{c.name}</span>
                  <span className={`block truncate text-xs ${c.unread ? 'font-semibold text-ink' : 'text-muted'}`}>
                    {c.last_from_admin ? 'Vous : ' : ''}
                    {c.last_body}
                  </span>
                </span>
                {c.unread > 0 && (
                  <span className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                    {c.unread > 9 ? '9+' : c.unread}
                  </span>
                )}
                <span className="shrink-0 text-xs text-muted">{timeAgo(c.last_at)}</span>
                <IconChevronRight width={16} height={16} className="shrink-0 text-muted" />
              </button>
            ))}
          </div>

          {/* Pagination : page 1 = conversations les plus récentes */}
          {pageCount > 1 && (
            <nav className="mt-4 flex flex-col items-center gap-2" aria-label="Pages">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="grid h-9 min-w-9 place-items-center rounded-lg border border-line bg-white px-2.5 text-sm font-semibold text-ink disabled:opacity-40"
                  aria-label="Plus récentes"
                >
                  ‹
                </button>
                {Array.from({ length: pageCount }, (_, i) => i)
                  .filter((i) => i === 0 || i === pageCount - 1 || Math.abs(i - page) <= 1)
                  .reduce<(number | '…')[]>((acc, i, idx, arr) => {
                    if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('…');
                    acc.push(i);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === '…' ? (
                      <span key={`gap-${i}`} className="px-1 text-sm text-muted">…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        aria-current={n === page ? 'page' : undefined}
                        className={`grid h-9 min-w-9 place-items-center rounded-lg px-2.5 text-sm font-semibold ${
                          n === page ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'
                        }`}
                      >
                        {n + 1}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={page >= pageCount - 1}
                  className="grid h-9 min-w-9 place-items-center rounded-lg border border-line bg-white px-2.5 text-sm font-semibold text-ink disabled:opacity-40"
                  aria-label="Plus anciennes"
                >
                  ›
                </button>
              </div>
              <p className="text-xs text-muted">
                Page {page + 1} sur {pageCount} · {total} conversation{total > 1 ? 's' : ''} · les plus récentes en premier
              </p>
            </nav>
          )}
        </>
      ) : (
        <div className="card flex flex-col items-center p-10 text-center">
          <IconChat width={26} height={26} className="text-muted" />
          <p className="mt-2 text-sm text-muted">
            Aucun message pour {contactByKey(coach)?.name} pour l&apos;instant.
          </p>
        </div>
      )}
    </>
  );
}

function AdminThread({
  me,
  coachKey,
  studentId,
  studentName,
  thread,
  onBack,
  onSent,
}: {
  me: Me;
  coachKey: string;
  studentId: string;
  studentName: string;
  thread: Msg[];
  onBack: () => void;
  onSent: (m: Msg) => void;
}) {
  const coach = contactByKey(coachKey)!;
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  async function reply() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const { data, error } = await supabase
      .from('support_messages')
      .insert({
        recipient: coachKey,
        student_id: studentId,
        sender_id: me.id,
        sender_name: `${coach.name} (${me.name})`,
        from_admin: true,
        body: text,
      })
      .select('id, recipient, student_id, body, from_admin, sender_name, created_at, ai_generated')
      .single();
    if (!error && data) {
      onSent(data as Msg);
      setBody('');
    }
    setBusy(false);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <button onClick={onBack} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-black/[0.04]" aria-label="Retour">
          <IconChevronRight width={16} height={16} className="rotate-180" />
        </button>
        <Avatar initials={initialsOf(studentName)} size={38} />
        <div>
          <p className="font-semibold text-ink">{studentName}</p>
          <p className="text-xs text-muted">Conversation avec {coach.name}</p>
        </div>
      </div>

      <div className="max-h-[50vh] space-y-3 overflow-y-auto p-4">
        {thread.map((m) => (
          <div key={m.id} className={`flex ${m.from_admin ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.from_admin ? 'bg-ink text-white' : 'bg-black/[0.05] text-ink'
              }`}
            >
              {m.ai_generated && (
                <span className="mb-1 inline-block rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  IA · pilote auto
                </span>
              )}
              {m.from_admin && m.sender_name && (
                <p className="mb-0.5 text-xs font-semibold text-white/70">{m.sender_name}</p>
              )}
              <p className="whitespace-pre-line">
                <RichText text={m.body} onDark={m.from_admin} />
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="input min-h-[44px] max-h-40 flex-1 resize-none"
          placeholder={`Répondre au nom de ${coach.name}…`}
          rows={1}
        />
        <button onClick={reply} disabled={busy || !body.trim()} className="btn-primary disabled:opacity-60">
          {busy ? '…' : 'Répondre'}
        </button>
      </div>
    </div>
  );
}
