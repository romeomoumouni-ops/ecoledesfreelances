'use client';

// Contrôle du Support IA public : toutes les discussions, avec les actions
// que l'IA a faites (vérifications, envois) pour vérifier ce qu'elle dit.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ensureRealtimeAuth } from '@/lib/realtime';
import { IconChevronRight, IconChat } from '@/components/Icons';

const supabase = createClient();
const PAGE_SIZE = 20;

type Chat = {
  id: string;
  created_at: string;
  last_at: string;
  verified_email: string | null;
  outcome: string | null;
  msg_count: number;
  last_user: string | null;
  last_assistant: string | null;
};
type Line = { id: number; role: 'user' | 'assistant' | 'note'; body: string; created_at: string };

const OUTCOME: Record<string, { label: string; cls: string }> = {
  paid_sent: { label: 'Accès envoyé', cls: 'bg-emerald-50 text-emerald-700' },
  paid_has_account_sent: { label: 'Rappel envoyé', cls: 'bg-emerald-50 text-emerald-700' },
  paid_no_account: { label: 'Payé · sans compte', cls: 'bg-amber-50 text-amber-700' },
  paid_has_account: { label: 'Payé · a un compte', cls: 'bg-blue-50 text-blue-700' },
  paid_expired: { label: 'Échéance à régler', cls: 'bg-amber-50 text-amber-700' },
  not_found: { label: 'Paiement introuvable', cls: 'bg-red-50 text-red-600' },
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}
function heure(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' });
}

export default function SupportAdminClient() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Chat | null>(null);
  const [lines, setLines] = useState<Line[]>([]);

  async function load(p: number) {
    setLoading(true);
    const { data } = await supabase.rpc('admin_support_chats', { p_page: p, p_size: PAGE_SIZE });
    const d = (data ?? { total: 0, items: [] }) as { total: number; items: Chat[] };
    setChats(d.items);
    setTotal(d.total);
    setLoading(false);
  }

  async function openChat(c: Chat) {
    setOpen(c);
    const { data } = await supabase
      .from('support_chat_messages')
      .select('id, role, body, created_at')
      .eq('chat_id', c.id)
      .order('created_at', { ascending: true });
    setLines((data ?? []) as Line[]);
  }

  useEffect(() => {
    void load(page);
  }, [page]);

  // Temps réel : nouvelle discussion / nouveau message → liste et fil ouvert à jour
  useEffect(() => {
    void ensureRealtimeAuth();
    const ch = supabase
      .channel('admin-support')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_chat_messages' }, (payload) => {
        const m = payload.new as Line & { chat_id: string };
        if (page === 0) void load(0);
        if (open && m.chat_id === open.id) setLines((ls) => (ls.some((x) => x.id === m.id) ? ls : [...ls, m]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, open?.id]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (open) {
    const o = open.outcome ? OUTCOME[open.outcome] : null;
    return (
      <>
        <button onClick={() => setOpen(null)} className="mb-3 text-sm font-semibold text-muted hover:text-ink">
          ‹ Toutes les discussions
        </button>
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
            <p className="text-sm font-bold text-ink">{open.verified_email ?? 'Adresse non vérifiée'}</p>
            {o && <span className={`chip px-2.5 py-1 text-xs ${o.cls}`}>{o.label}</span>}
            <span className="ml-auto text-xs text-muted">
              {new Date(open.created_at).toLocaleString('fr-FR', { timeZone: 'Africa/Porto-Novo' })}
            </span>
          </div>
          <div className="space-y-3 p-4">
            {lines.map((l) =>
              l.role === 'note' ? (
                <p key={l.id} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                  <span className="font-semibold">{heure(l.created_at)}</span> · {l.body}
                </p>
              ) : (
                <div key={l.id} className={`flex ${l.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      l.role === 'assistant' ? 'bg-black/[0.05] text-ink' : 'bg-ink text-white'
                    }`}
                  >
                    <span className={`mb-0.5 block text-[10px] font-bold uppercase tracking-wide ${l.role === 'assistant' ? 'text-muted' : 'text-white/60'}`}>
                      {l.role === 'assistant' ? 'IA' : 'Visiteur'} · {heure(l.created_at)}
                    </span>
                    {l.body}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-ink">Support IA</h1>
      <p className="mb-5 text-sm text-muted">
        Les discussions du guichet public <a href="/support" target="_blank" rel="noreferrer" className="underline">/support</a> :
        qui a écrit, ce que l&apos;IA a vérifié et envoyé. Temps réel.
      </p>

      {loading && !chats.length ? (
        <p className="py-8 text-center text-sm text-muted">Chargement…</p>
      ) : chats.length ? (
        <>
          <div className={`card divide-y divide-line overflow-hidden ${loading ? 'opacity-60' : ''}`}>
            {chats.map((c) => {
              const o = c.outcome ? OUTCOME[c.outcome] : null;
              return (
                <button key={c.id} onClick={() => openChat(c)} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-black/[0.02]">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{c.verified_email ?? 'Adresse non vérifiée'}</span>
                      {o && <span className={`chip px-2 py-0.5 text-[11px] ${o.cls}`}>{o.label}</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      <b className="font-semibold text-ink/70">Visiteur :</b> {c.last_user ?? '—'}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      <b className="font-semibold text-ink/70">IA :</b> {c.last_assistant ?? '—'}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted">
                    {timeAgo(c.last_at)}
                    <span className="block">{c.msg_count} msg</span>
                  </span>
                  <IconChevronRight width={16} height={16} className="shrink-0 text-muted" />
                </button>
              );
            })}
          </div>
          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-outline py-1.5 disabled:opacity-40">‹ Plus récentes</button>
              <span className="text-xs text-muted">Page {page + 1} / {pageCount} · {total} discussions</span>
              <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="btn-outline py-1.5 disabled:opacity-40">Plus anciennes ›</button>
            </div>
          )}
        </>
      ) : (
        <div className="card flex flex-col items-center p-10 text-center">
          <IconChat width={26} height={26} className="text-muted" />
          <p className="mt-2 text-sm text-muted">Aucune discussion pour l&apos;instant.</p>
        </div>
      )}
    </>
  );
}
