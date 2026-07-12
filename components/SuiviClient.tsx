'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import { PageHeader } from '@/components/UI';
import Avatar from '@/components/Avatar';
import RichText from '@/components/RichText';
import { IconShield, IconChat } from '@/components/Icons';

const supabase = createClient();

type Me = { id: string; name: string };
type Msg = {
  id: string;
  body: string;
  from_admin: boolean;
  sender_name: string | null;
  created_at: string;
};

export default function SuiviClient({ me }: { me: Me }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function markRead() {
    await supabase.from('read_marks').upsert(
      { user_id: me.id, scope: 'suivi', last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,scope' }
    );
    router.refresh();
  }

  useEffect(() => {
    let active = true;
    supabase
      .from('followup_messages')
      .select('id, body, from_admin, sender_name, created_at')
      .eq('student_id', me.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (active) {
          setMessages(data ?? []);
          setLoading(false);
          void markRead();
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id]);

  useEffect(() => {
    void ensureRealtimeAuth();
    const channel = supabase
      .channel(`suivi-${me.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'followup_messages', filter: `student_id=eq.${me.id}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.from_admin) void markRead();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const { data, error } = await supabase
      .from('followup_messages')
      .insert({ student_id: me.id, sender_id: me.id, sender_name: me.name, from_admin: false, body: text })
      .select('id, body, from_admin, sender_name, created_at')
      .single();
    if (!error && data) {
      setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data]));
      setBody('');
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Suivi hebdomadaire"
        subtitle="Ta messagerie privée avec ton chargé de suivi."
      />

      {/* But de l'espace */}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-line bg-black/[0.02] p-4">
        <span className="mt-0.5 shrink-0 text-ink">
          <IconShield width={20} height={20} />
        </span>
        <p className="text-sm leading-relaxed text-ink">
          Cette discussion avec ton chargé de suivi sert à suivre ton évolution
          tout au long du programme. Sois courtois et respectueux dans l&apos;échange.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="max-h-[55vh] space-y-3 overflow-y-auto p-4">
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
                    <p className="mb-0.5 text-xs font-semibold text-muted">{m.sender_name || 'Chargé de suivi'}</p>
                  )}
                  <p className="whitespace-pre-line">
                    <RichText text={m.body} onDark={!m.from_admin} />
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <IconChat width={26} height={26} className="text-muted" />
              <p className="mt-2 text-sm text-muted">
                Écris à ton chargé de suivi pour faire le point sur ton avancée.
              </p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-end gap-2 border-t border-line p-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              // Entrée = envoyer (Maj+Entrée = nouvelle ligne), comme partout ailleurs
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="input min-h-[44px] max-h-40 flex-1 resize-none"
            placeholder="Écris ton message…"
            rows={1}
          />
          <button onClick={send} disabled={busy || !body.trim()} className="btn-primary disabled:opacity-60">
            {busy ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}
