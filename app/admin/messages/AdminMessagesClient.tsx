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
type Marks = Map<string, number>; // scope -> last_read_at (ms)

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
  const [messages, setMessages] = useState<Msg[]>([]); // TOUS les messages (tous coachs)
  const [marks, setMarks] = useState<Marks>(new Map());
  const [student, setStudent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Pilote automatique (IA) par coach + taille de sa boîte de data
  const [pilots, setPilots] = useState<Record<string, boolean>>({});
  const [dataCount, setDataCount] = useState<Record<string, { n: number; chars: number }>>({});
  const [pilotBusy, setPilotBusy] = useState(false);

  async function loadAll() {
    // Supabase plafonne chaque requête à 1000 lignes : on pagine pour TOUT
    // ramener, et on exclut les envois groupés de la Messagerie (68 000+ lignes
    // qui noyaient les vrais messages — les coachs ne voyaient plus rien).
    const PAGE = 1000;
    const msgs: Msg[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data } = await supabase
        .from('support_messages')
        .select('id, recipient, student_id, body, from_admin, sender_name, created_at, ai_generated')
        .eq('broadcast', false)
        .order('created_at', { ascending: true })
        .range(from, from + PAGE - 1);
      msgs.push(...((data ?? []) as Msg[]));
      if (!data || data.length < PAGE) break;
    }
    const [{ data: mk }, { data: pl }, { data: kd }] = await Promise.all([
      supabase.from('read_marks').select('scope, last_read_at').eq('user_id', me.id),
      supabase.from('coach_autopilot').select('coach_key, enabled'),
      supabase.from('coach_reply_data').select('coach_key, chars'),
    ]);
    setPilots(Object.fromEntries((pl ?? []).map((p) => [p.coach_key, p.enabled])));
    const dc: Record<string, { n: number; chars: number }> = {};
    for (const k of kd ?? []) {
      dc[k.coach_key] = { n: (dc[k.coach_key]?.n ?? 0) + 1, chars: (dc[k.coach_key]?.chars ?? 0) + (k.chars ?? 0) };
    }
    setDataCount(dc);
    setMessages(msgs);
    setMarks(new Map((mk ?? []).map((m) => [m.scope, new Date(m.last_read_at).getTime()])));
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Temps réel : tout nouveau message (élève ou autre admin) apparaît sans recharger
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
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function isUnread(m: Msg): boolean {
    if (m.from_admin) return false;
    const seen = marks.get(scopeOf(m.recipient, m.student_id)) ?? 0;
    return new Date(m.created_at).getTime() > seen;
  }

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
    const scope = scopeOf(coachKey, studentId);
    const now = Date.now();
    setMarks((prev) => new Map(prev).set(scope, now));
    await supabase.from('read_marks').upsert(
      { user_id: me.id, scope, last_read_at: new Date(now).toISOString() },
      { onConflict: 'user_id,scope' }
    );
    router.refresh(); // met à jour la pastille de la nav admin
  }

  // Marque lu quand un nouveau message élève arrive alors que le fil est ouvert
  useEffect(() => {
    if (!student) return;
    const hasNew = messages.some((m) => m.recipient === coach && m.student_id === student && isUnread(m));
    if (hasNew) void markRead(coach, student);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, student]);

  const coachMessages = messages.filter((m) => m.recipient === coach);
  const unreadByCoach: Record<string, number> = {};
  for (const m of messages) if (isUnread(m)) unreadByCoach[m.recipient] = (unreadByCoach[m.recipient] ?? 0) + 1;

  // Conversations groupées par élève (pour le coach sélectionné)
  const conversations = new Map<string, { name: string; last: Msg; unread: number }>();
  for (const m of coachMessages) {
    const prev = conversations.get(m.student_id);
    const name = !m.from_admin && m.sender_name ? m.sender_name : prev?.name || 'Élève';
    conversations.set(m.student_id, {
      name,
      last: m,
      unread: (prev?.unread ?? 0) + (isUnread(m) ? 1 : 0),
    });
  }
  const convList = [...conversations.entries()].sort(
    (a, b) => new Date(b[1].last.created_at).getTime() - new Date(a[1].last.created_at).getTime()
  );

  const thread = student ? coachMessages.filter((m) => m.student_id === student) : [];
  const studentName = student ? conversations.get(student)?.name ?? 'Élève' : '';

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
      {!loading && !student && (
        <div className="card mb-5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-bold text-ink">
                {pilots[coach] ? '🤖 Pilote automatique activé' : '🧑‍🏫 Réponses manuelles'}
                <span className="text-xs font-normal text-muted">— {contactByKey(coach)?.name}</span>
              </p>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
                {pilots[coach]
                  ? "L'IA répond aux élèves à ta place, avec ta boîte de data. Tu gardes la main : tes propres réponses passent toujours, et tu peux couper à tout moment."
                  : "Tu réponds toi-même à chaque message. Active le pilote automatique pour que l'IA réponde en ton nom, à partir de ta boîte de data."}
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
            href={`/admin/data-reponses?coach=${coach}`}
            className="mt-4 flex items-center gap-4 rounded-xl border border-dashed border-line p-3 transition hover:border-ink hover:bg-black/[0.015]"
          >
            <span className="relative grid h-12 w-14 shrink-0 place-items-center">
              <svg viewBox="0 0 56 44" width="56" height="44" fill="none" aria-hidden>
                <path d="M4 14h48v24a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V14Z" fill="#f3f3f1" stroke="#1d1d1f" strokeWidth="2" />
                <path d="M2 8a2 2 0 0 1 2-2h48a2 2 0 0 1 2 2v6H2V8Z" fill="#ffffff" stroke="#1d1d1f" strokeWidth="2" />
                <path d="M22 22h12" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {(dataCount[coach]?.n ?? 0) > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-ink px-1.5 text-[11px] font-bold text-white">
                  {dataCount[coach]?.n}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink">Boîte de data</span>
              <span className="block text-xs text-muted">
                {(dataCount[coach]?.n ?? 0) > 0
                  ? `${dataCount[coach].n} élément(s) · ${Math.round((dataCount[coach].chars ?? 0) / 1000)} k caractères — l'IA répond avec tes mots.`
                  : "Vide pour l'instant : l'IA répond avec des conseils généraux. Ajoute tes réponses types, tes PDF, tes pages."}
              </span>
            </span>
            <IconChevronRight width={16} height={16} className="shrink-0 text-muted" />
          </a>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-muted">Chargement…</p>
      ) : student ? (
        <AdminThread
          me={me}
          coachKey={coach}
          studentId={student}
          studentName={studentName}
          thread={thread}
          onBack={() => setStudent(null)}
          onSent={(m) => setMessages((all) => (all.some((x) => x.id === m.id) ? all : [...all, m]))}
        />
      ) : convList.length ? (
        <div className="card divide-y divide-line overflow-hidden">
          {convList.map(([sid, c]) => (
            <button
              key={sid}
              onClick={() => {
                setStudent(sid);
                void markRead(coach, sid);
              }}
              className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-black/[0.02]"
            >
              <Avatar initials={initialsOf(c.name)} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{c.name}</span>
                <span className={`block truncate text-xs ${c.unread ? 'font-semibold text-ink' : 'text-muted'}`}>
                  {c.last.from_admin ? 'Vous : ' : ''}
                  {c.last.body}
                </span>
              </span>
              {c.unread > 0 && (
                <span className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                  {c.unread > 9 ? '9+' : c.unread}
                </span>
              )}
              <span className="shrink-0 text-xs text-muted">{timeAgo(c.last.created_at)}</span>
              <IconChevronRight width={16} height={16} className="shrink-0 text-muted" />
            </button>
          ))}
        </div>
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
