'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import Avatar from '@/components/Avatar';
import { IconChat, IconChevronRight } from '@/components/Icons';

const supabase = createClient();

type Me = { id: string; name: string };
type Student = { id: string; name: string; email: string; avatar: string | null; isAdmin?: boolean };
type Msg = {
  id: string;
  student_id: string;
  body: string;
  from_admin: boolean;
  sender_name: string | null;
  created_at: string;
};

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
const scopeOf = (sid: string) => `suivicv:${sid}`;

export default function AdminSuiviClient({ me, students }: { me: Me; students: Student[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [marks, setMarks] = useState<Map<string, number>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  async function loadAll() {
    const [{ data: msgs }, { data: mk }] = await Promise.all([
      supabase
        .from('followup_messages')
        .select('id, student_id, body, from_admin, sender_name, created_at')
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

  useEffect(() => {
    void ensureRealtimeAuth();
    const channel = supabase
      .channel('admin-suivi')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'followup_messages' }, (payload) => {
        const m = payload.new as Msg;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function isUnread(m: Msg) {
    if (m.from_admin) return false;
    return new Date(m.created_at).getTime() > (marks.get(scopeOf(m.student_id)) ?? 0);
  }

  async function markRead(sid: string) {
    const scope = scopeOf(sid);
    const now = Date.now();
    setMarks((prev) => new Map(prev).set(scope, now));
    await supabase.from('read_marks').upsert(
      { user_id: me.id, scope, last_read_at: new Date(now).toISOString() },
      { onConflict: 'user_id,scope' }
    );
    router.refresh();
  }

  // Marque lu à l'arrivée d'un message quand le fil est ouvert
  useEffect(() => {
    if (!selected) return;
    if (messages.some((m) => m.student_id === selected && isUnread(m))) void markRead(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, selected]);

  const lastByStudent = new Map<string, Msg>();
  const unreadByStudent: Record<string, number> = {};
  for (const m of messages) {
    lastByStudent.set(m.student_id, m);
    if (isUnread(m)) unreadByStudent[m.student_id] = (unreadByStudent[m.student_id] ?? 0) + 1;
  }

  // Liste : tout compte ayant une conversation (même admin) d'abord, puis les
  // élèves (non-admins) sans message encore, pour pouvoir démarrer un suivi.
  const withMsg = students.filter((s) => lastByStudent.has(s.id));
  const withoutMsg = students.filter((s) => !lastByStudent.has(s.id) && !s.isAdmin);
  withMsg.sort((a, b) => {
    const ua = unreadByStudent[a.id] ?? 0, ub = unreadByStudent[b.id] ?? 0;
    if (ua !== ub) return ub - ua;
    return new Date(lastByStudent.get(b.id)!.created_at).getTime() - new Date(lastByStudent.get(a.id)!.created_at).getTime();
  });
  const ordered = [...withMsg, ...withoutMsg].filter(
    (s) => !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.email.toLowerCase().includes(query.toLowerCase())
  );

  const selStudent = students.find((s) => s.id === selected);
  const thread = selected ? messages.filter((m) => m.student_id === selected) : [];

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-ink">Suivi hebdomadaire</h1>
      <p className="mb-4 text-sm text-muted">
        Messagerie privée avec chaque élève. Tout admin (chargé de suivi) peut lire et répondre. Temps réel.
      </p>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted">Chargement…</p>
      ) : selected && selStudent ? (
        <AdminSuiviThread me={me} student={selStudent} thread={thread} onBack={() => setSelected(null)} onSent={(m) => setMessages((all) => (all.some((x) => x.id === m.id) ? all : [...all, m]))} />
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input mb-4 max-w-sm"
            placeholder="Rechercher un élève…"
          />
          {ordered.length ? (
            <div className="card divide-y divide-line overflow-hidden">
              {ordered.map((s) => {
                const last = lastByStudent.get(s.id);
                const unread = unreadByStudent[s.id] ?? 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelected(s.id);
                      void markRead(s.id);
                    }}
                    className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-black/[0.02]"
                  >
                    <Avatar initials={initialsOf(s.name)} src={s.avatar} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{s.name || s.email}</span>
                      <span className={`block truncate text-xs ${unread ? 'font-semibold text-ink' : 'text-muted'}`}>
                        {last ? `${last.from_admin ? 'Vous : ' : ''}${last.body}` : 'Pas encore de message — démarrer le suivi'}
                      </span>
                    </span>
                    {unread > 0 && (
                      <span className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                    {last && <span className="shrink-0 text-xs text-muted">{timeAgo(last.created_at)}</span>}
                    <IconChevronRight width={16} height={16} className="shrink-0 text-muted" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="card flex flex-col items-center p-10 text-center">
              <IconChat width={26} height={26} className="text-muted" />
              <p className="mt-2 text-sm text-muted">Aucun élève trouvé.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}

function AdminSuiviThread({
  me,
  student,
  thread,
  onBack,
  onSent,
}: {
  me: Me;
  student: Student;
  thread: Msg[];
  onBack: () => void;
  onSent: (m: Msg) => void;
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  async function reply() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const { data, error } = await supabase
      .from('followup_messages')
      .insert({ student_id: student.id, sender_id: me.id, sender_name: me.name, from_admin: true, body: text })
      .select('id, student_id, body, from_admin, sender_name, created_at')
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
        <Avatar initials={initialsOf(student.name)} src={student.avatar} size={38} />
        <div>
          <p className="font-semibold text-ink">{student.name || student.email}</p>
          <p className="text-xs text-muted">{student.email}</p>
        </div>
      </div>

      <div className="max-h-[50vh] space-y-3 overflow-y-auto p-4">
        {thread.length ? (
          thread.map((m) => (
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
          ))
        ) : (
          <p className="py-6 text-center text-sm text-muted">Démarre le suivi avec cet élève.</p>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="input min-h-[44px] max-h-40 flex-1 resize-none"
          placeholder={`Message à ${student.name || 'l’élève'}…`}
          rows={1}
        />
        <button onClick={reply} disabled={busy || !body.trim()} className="btn-primary disabled:opacity-60">
          {busy ? '…' : 'Envoyer'}
        </button>
      </div>
    </div>
  );
}
