'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import { PageHeader } from '@/components/UI';
import Avatar from '@/components/Avatar';
import { CONTACTS, contactByKey } from '@/lib/coaches';
import { IconChat, IconChevronRight } from '@/components/Icons';

const supabase = createClient();

type Me = { id: string; name: string };
type Msg = {
  id: string;
  recipient: string;
  body: string;
  from_admin: boolean;
  sender_name: string | null;
  created_at: string;
};

async function markRead(userId: string, coachKey: string) {
  await supabase.from('read_marks').upsert(
    { user_id: userId, scope: `contact:${coachKey}`, last_read_at: new Date().toISOString() },
    { onConflict: 'user_id,scope' }
  );
}

export default function ContactClient({ me }: { me: Me }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [unread, setUnread] = useState<Record<string, number>>({});

  // Non-lus par coach (réponses admin plus récentes que mon marqueur de lecture)
  async function loadUnread() {
    const [{ data: msgs }, { data: marks }] = await Promise.all([
      supabase
        .from('support_messages')
        .select('recipient, created_at')
        .eq('student_id', me.id)
        .eq('from_admin', true),
      supabase.from('read_marks').select('scope, last_read_at').eq('user_id', me.id),
    ]);
    const readAt = new Map(
      (marks ?? [])
        .filter((m) => m.scope.startsWith('contact:'))
        .map((m) => [m.scope.slice(8), new Date(m.last_read_at).getTime()])
    );
    const counts: Record<string, number> = {};
    for (const m of msgs ?? []) {
      if (new Date(m.created_at).getTime() > (readAt.get(m.recipient) ?? 0)) {
        counts[m.recipient] = (counts[m.recipient] ?? 0) + 1;
      }
    }
    setUnread(counts);
  }

  useEffect(() => {
    loadUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  function openThread(key: string) {
    setSelected(key);
    void markRead(me.id, key).then(() => router.refresh());
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Contacter les coachs"
        subtitle="Choisis la personne à qui tu veux écrire. Elle te répondra ici."
      />

      {!selected ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {CONTACTS.map((c) => (
            <button
              key={c.key}
              onClick={() => openThread(c.key)}
              className="card group relative flex items-center gap-4 p-5 text-left transition hover:border-[#e0e0de] hover:shadow-soft"
            >
              <Avatar initials={c.name.replace('Coach ', '').slice(0, 2).toUpperCase()} size={48} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{c.name}</span>
                <span className="block text-xs text-muted">{c.role} · Envoyer un message</span>
              </span>
              {unread[c.key] ? (
                <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                  {unread[c.key] > 9 ? '9+' : unread[c.key]}
                </span>
              ) : (
                <IconChevronRight width={18} height={18} className="text-muted transition group-hover:translate-x-0.5" />
              )}
            </button>
          ))}
        </div>
      ) : (
        <Thread me={me} contactKey={selected} onBack={() => setSelected(null)} />
      )}
    </div>
  );
}

function Thread({ me, contactKey, onBack }: { me: Me; contactKey: string; onBack: () => void }) {
  const router = useRouter();
  const contact = contactByKey(contactKey)!;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from('support_messages')
      .select('id, recipient, body, from_admin, sender_name, created_at')
      .eq('student_id', me.id)
      .eq('recipient', contactKey)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (active) {
          setMessages(data ?? []);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [contactKey, me.id]);

  // Temps réel : la réponse du coach apparaît sans recharger
  useEffect(() => {
    void ensureRealtimeAuth();
    const channel = supabase
      .channel(`thread-${me.id}-${contactKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `student_id=eq.${me.id}`,
        },
        (payload) => {
          const m = payload.new as Msg;
          if (m.recipient !== contactKey) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.from_admin) {
            void markRead(me.id, contactKey).then(() => router.refresh());
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactKey, me.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const { data, error } = await supabase
      .from('support_messages')
      .insert({
        recipient: contactKey,
        student_id: me.id,
        sender_id: me.id,
        sender_name: me.name,
        from_admin: false,
        body: text,
      })
      .select('id, recipient, body, from_admin, sender_name, created_at')
      .single();
    if (!error && data) {
      setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data]));
      setBody('');
    }
    setBusy(false);
  }

  return (
    <div className="card overflow-hidden">
      {/* En-tête du fil */}
      <div className="flex items-center gap-3 border-b border-line p-4">
        <button onClick={onBack} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-black/[0.04]" aria-label="Retour">
          <IconChevronRight width={16} height={16} className="rotate-180" />
        </button>
        <Avatar initials={contact.name.replace('Coach ', '').slice(0, 2).toUpperCase()} size={38} />
        <div>
          <p className="font-semibold text-ink">{contact.name}</p>
          <p className="text-xs text-muted">Répond généralement sous 24 h</p>
        </div>
      </div>

      {/* Messages */}
      <div className="max-h-[50vh] space-y-3 overflow-y-auto p-4">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted">Chargement…</p>
        ) : messages.length ? (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.from_admin ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.from_admin ? 'bg-black/[0.05] text-ink' : 'bg-ink text-white'
                }`}
              >
                {m.from_admin && (
                  <p className="mb-0.5 text-xs font-semibold text-muted">{m.sender_name || contact.name}</p>
                )}
                <p className="whitespace-pre-line">{m.body}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center py-8 text-center">
            <IconChat width={26} height={26} className="text-muted" />
            <p className="mt-2 text-sm text-muted">
              Écris ton premier message à {contact.name}.
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="input min-h-[44px] max-h-40 flex-1 resize-none"
          placeholder={`Message à ${contact.name}…`}
          rows={1}
        />
        <button onClick={send} disabled={busy || !body.trim()} className="btn-primary disabled:opacity-60">
          {busy ? '…' : 'Envoyer'}
        </button>
      </div>
    </div>
  );
}
