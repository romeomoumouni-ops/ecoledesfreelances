'use client';

// « Data des réponses » : la documentation que chaque coach confie à l'IA du
// pilote automatique. Texte libre, PDF ou page web — le serveur extrait le
// texte et l'IA s'appuie dessus pour répondre aux élèves au nom du coach.

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CONTACTS } from '@/lib/coaches';
import type { DataItem } from './page';
import { IconFile, IconX } from '@/components/Icons';

const KIND_LABEL: Record<DataItem['kind'], string> = { text: 'Texte', pdf: 'PDF', url: 'Page web' };

function fmtChars(n: number) {
  return n >= 1000 ? `${Math.round(n / 1000)} k caractères` : `${n} caractères`;
}
function dateFr(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function DataReponsesClient({
  items: initial,
  pilots,
  initialCoach,
}: {
  items: DataItem[];
  pilots: Record<string, boolean>;
  initialCoach?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [coach, setCoach] = useState(
    CONTACTS.some((c) => c.key === initialCoach) ? (initialCoach as string) : CONTACTS[0].key
  );
  const [mode, setMode] = useState<'text' | 'url' | 'pdf'>('text');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const mine = useMemo(() => items.filter((i) => i.coach_key === coach), [items, coach]);
  const totalChars = mine.reduce((s, i) => s + i.chars, 0);
  const current = CONTACTS.find((c) => c.key === coach)!;

  async function add() {
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.set('coach', coach);
    fd.set('kind', mode);
    fd.set('title', title);
    if (mode === 'text') fd.set('content', text);
    if (mode === 'url') fd.set('url', url);
    if (mode === 'pdf') {
      const f = fileRef.current?.files?.[0];
      if (!f) { setMsg({ ok: false, text: 'Choisis un fichier PDF.' }); setBusy(false); return; }
      fd.set('file', f);
    }
    try {
      const res = await fetch('/api/admin/coach-data', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Échec de l’ajout.');
      setItems((xs) => [j.item as DataItem, ...xs]);
      setTitle(''); setText(''); setUrl('');
      if (fileRef.current) fileRef.current.value = '';
      setMsg({ ok: true, text: `Ajouté : « ${(j.item as DataItem).title} » (${fmtChars((j.item as DataItem).chars)}). L’IA l’utilise dès maintenant.` });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Échec de l’ajout.' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: DataItem) {
    if (!confirm(`Retirer « ${item.title} » de la boîte de data de ${current.name} ?`)) return;
    const before = items;
    setItems((xs) => xs.filter((x) => x.id !== item.id));
    const res = await fetch(`/api/admin/coach-data?id=${item.id}`, { method: 'DELETE' });
    if (!res.ok) { setItems(before); setMsg({ ok: false, text: 'La suppression a échoué.' }); }
  }

  const tab = (k: typeof mode, label: string) => (
    <button
      onClick={() => setMode(k)}
      className={`chip px-4 py-2 text-sm transition ${mode === k ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'}`}
    >
      {label}
    </button>
  );

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-ink">Data des réponses</h1>
      <p className="mb-5 max-w-2xl text-sm text-muted">
        Tout ce que tu mets ici, l&apos;IA du <b className="text-ink">pilote automatique</b> s&apos;en sert pour répondre aux
        élèves <b className="text-ink">à ta place, avec tes mots</b>. Plus ta boîte est riche, plus ses réponses te ressemblent.
      </p>

      {/* Choix du coach */}
      <div className="mb-5 flex flex-wrap gap-2">
        {CONTACTS.map((c) => {
          const n = items.filter((i) => i.coach_key === c.key).length;
          return (
            <button
              key={c.key}
              onClick={() => setCoach(c.key)}
              className={`chip gap-2 px-4 py-2.5 text-sm transition ${coach === c.key ? 'bg-ink text-white' : 'border border-line bg-white text-muted hover:text-ink'}`}
            >
              {c.name}
              <span className={coach === c.key ? 'text-white/60' : 'text-muted/70'}>{n}</span>
              {pilots[c.key] && <span title="Pilote automatique activé">🤖</span>}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Ajouter */}
        <div className="card p-5">
          <p className="text-sm font-bold text-ink">Ajouter à la boîte de {current.name}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tab('text', '✍️ Texte')}
            {tab('pdf', '📄 PDF')}
            {tab('url', '🔗 Page web')}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input mt-4"
            placeholder="Titre (optionnel — ex. « Questions fréquentes sur les lives »)"
            maxLength={120}
          />

          {mode === 'text' && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              className="input mt-3 w-full resize-y font-mono text-[13px] leading-relaxed"
              placeholder={`Écris ici comme tu répondrais à tes élèves. Par exemple :\n\n— Les questions qu'on te pose le plus souvent, et ta réponse pour chacune.\n— Comment tu parles (ton, expressions, ce que tu dis toujours).\n— Les règles du programme : lives, replays, exercices, délais.\n— Ce que tu veux que l'IA ne dise JAMAIS.\n\nPlus c'est précis, plus l'IA répond comme toi.`}
            />
          )}
          {mode === 'url' && (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input mt-3"
              placeholder="https://… (le texte de la page sera extrait et mémorisé)"
            />
          )}
          {mode === 'pdf' && (
            <div className="mt-3 rounded-xl border border-dashed border-line p-4 text-sm text-muted">
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="block w-full text-sm" />
              <p className="mt-2 text-xs">PDF texte (pas une image scannée) · 15 Mo max. Le texte est extrait automatiquement.</p>
            </div>
          )}

          {msg && (
            <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {msg.text}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={add}
              disabled={busy || (mode === 'text' && text.trim().length < 20) || (mode === 'url' && !url.trim())}
              className="btn-primary disabled:opacity-60"
            >
              {busy ? 'Traitement…' : 'Ajouter à la boîte de data'}
            </button>
          </div>
        </div>

        {/* Contenu de la boîte */}
        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Boîte de data</p>
            <p className="mt-1 text-3xl font-bold text-ink">{mine.length}</p>
            <p className="text-xs text-muted">
              élément{mine.length > 1 ? 's' : ''} · {fmtChars(totalChars)}
              {totalChars > 60_000 && <> · <span className="text-amber-700">au-delà de 60 k, les plus anciens sont ignorés</span></>}
            </p>
            <p className="mt-3 text-xs text-muted">
              Pilote automatique : <b className={pilots[coach] ? 'text-emerald-700' : 'text-ink'}>{pilots[coach] ? 'activé 🤖' : 'désactivé'}</b>
              {' '}— se règle dans <a href="/admin/messages" className="underline">Messages</a>.
            </p>
          </div>

          {mine.length ? (
            <div className="card divide-y divide-line overflow-hidden">
              {mine.map((i) => (
                <div key={i.id} className="flex items-start gap-3 p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/[0.04] text-muted">
                    <IconFile width={16} height={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{i.title}</p>
                    <p className="truncate text-xs text-muted">
                      {KIND_LABEL[i.kind]} · {fmtChars(i.chars)} · {dateFr(i.created_at)}
                      {i.source && <> · <span title={i.source}>{i.source.replace(/^https?:\/\//, '').slice(0, 40)}</span></>}
                    </p>
                  </div>
                  <button onClick={() => remove(i)} className="text-muted hover:text-red-600" aria-label="Retirer">
                    <IconX width={15} height={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center text-sm text-muted">
              La boîte de {current.name} est vide. Sans data, l&apos;IA répond avec des conseils généraux ; avec ta data, elle répond comme toi.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
