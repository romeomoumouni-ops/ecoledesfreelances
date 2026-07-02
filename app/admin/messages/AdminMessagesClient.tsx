'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import Avatar from '@/components/Avatar';
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

  async function loadAll() {
    const [{ data: msgs }, { data: mk }] = await Promise.all([
      supabase
        .from('support_messages')
        .select('id, recipient, student_id, body, from_admin, sender_name, created_at')
        .order('created_at', { ascending: true }),
      supabase.from('read_marks').select('scope, last_read_at').eq('user_id', me.id),
    ]);
    setMessages(msgs ?? []);
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
          const m = payload.new as Msg;
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
      .select('id, recipient, student_id, body, from_admin, sender_name, created_at')
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
              {m.from_admin && m.sender_name && (
                <p className="mb-0.5 text-xs font-semibold text-white/70">{m.sender_name}</p>
              )}
              <p className="whitespace-pre-line">{m.body}</p>
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
