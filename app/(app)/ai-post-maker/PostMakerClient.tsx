'use client';

import { useRef, useState } from 'react';
import { IconSparkle, IconClipboard, IconCheck, IconArrowRight } from '@/components/Icons';

const PLATFORMS = ['LinkedIn', 'Instagram', 'X (Twitter)', 'TikTok', 'Facebook', 'Threads'];
const TYPES = [
  'Storytelling / anecdote',
  'Conseil / astuce',
  'Éducatif (how-to)',
  'Promotion d’une offre',
  'Étude de cas / résultat',
  'Opinion / prise de position',
  'Question d’engagement',
];
const TONES = ['Professionnel', 'Inspirant', 'Décontracté', 'Percutant', 'Amical', 'Expert', 'Humoristique'];
const LENGTHS = ['Court', 'Moyen', 'Long'];

async function streamTo(url: string, body: unknown, onChunk: (t: string) => void): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || 'Une erreur est survenue.');
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(dec.decode(value, { stream: true }));
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* ignore */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-50"
    >
      {copied ? <IconCheck width={14} height={14} /> : <IconClipboard width={14} height={14} />}
      {copied ? 'Copié' : 'Copier'}
    </button>
  );
}

const inputCls =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted/60 focus:border-orange-400 focus:ring-4 focus:ring-orange-100';
const labelCls = 'block text-sm font-semibold text-ink mb-1.5';

export default function PostMakerClient({ name, validUntil }: { name: string; validUntil: string | null }) {
  const [tab, setTab] = useState<'posts' | 'prospect'>('posts');
  const validLabel = validUntil
    ? new Date(validUntil).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      {/* En-tête */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-soft">
            <IconSparkle width={22} height={22} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">AI Post Maker</h1>
            <p className="text-sm text-muted">Salut {name.split(' ')[0]} — crée du contenu et signe des clients.</p>
          </div>
        </div>
        {validLabel && (
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
            Abonné · jusqu’au {validLabel}
          </span>
        )}
      </div>

      {/* Onglets */}
      <div className="mb-5 inline-flex rounded-xl border border-line bg-white p-1">
        {(['posts', 'prospect'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t ? 'bg-orange-500 text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {t === 'posts' ? 'Générateur de posts' : 'Assistant prospection'}
          </button>
        ))}
      </div>

      {tab === 'posts' ? <PostGenerator /> : <ProspectAssistant />}
    </div>
  );
}

/* ------------------------------ Onglet Posts ------------------------------ */

function PostGenerator() {
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [type, setType] = useState(TYPES[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [length, setLength] = useState(LENGTHS[1]);
  const [niche, setNiche] = useState('');
  const [keywords, setKeywords] = useState('');
  const [subject, setSubject] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function generate() {
    if (!subject.trim()) { setErr('Décris le sujet de ton post.'); return; }
    setErr(''); setBusy(true); setOut('');
    try {
      await streamTo('/api/post-maker/post', { platform, type, tone, length, niche, keywords, subject }, (t) =>
        setOut((prev) => prev + t)
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Plateforme</label>
            <select className={inputCls} value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Type de post</label>
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Ton</label>
            <select className={inputCls} value={tone} onChange={(e) => setTone(e.target.value)}>
              {TONES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Longueur</label>
            <select className={inputCls} value={length} onChange={(e) => setLength(e.target.value)}>
              {LENGTHS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Niche / thématique</label>
            <input className={inputCls} value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Ex : design de logo, coaching, e-commerce…" />
          </div>
          <div>
            <label className={labelCls}>Mots-clés (optionnel)</label>
            <input className={inputCls} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Ex : freelance, IA, Comeup…" />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelCls}>Sujet / idée du post</label>
          <textarea
            className={`${inputCls} min-h-[90px] resize-y`}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="De quoi veux-tu parler ? Ex : comment j’ai trouvé mon premier client en 7 jours…"
          />
        </div>
        {err && <p className="mt-3 text-sm font-medium text-red-600">{err}</p>}
        <button
          onClick={generate}
          disabled={busy}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 active:scale-[0.99] disabled:opacity-60 sm:w-auto"
        >
          <IconSparkle width={17} height={17} />
          {busy ? 'Génération…' : out ? 'Regénérer' : 'Générer le post'}
        </button>
      </div>

      {(out || busy) && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-orange-700">Ton post</span>
            {out && !busy && <CopyButton text={out} />}
          </div>
          <div className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink">
            {out}
            {busy && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-orange-400 align-middle" />}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------- Onglet Prospection --------------------------- */

type ChatMsg = { from: 'prospect' | 'me'; text: string };

function ProspectAssistant() {
  const [prospect, setProspect] = useState('');
  const [service, setService] = useState('');
  const [tone, setTone] = useState('');
  const [opener, setOpener] = useState('');
  const [busyOpener, setBusyOpener] = useState(false);
  const [err, setErr] = useState('');

  // Chat de closing
  const [conv, setConv] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [busyReply, setBusyReply] = useState(false);
  const convRef = useRef<HTMLDivElement>(null);

  async function genOpener() {
    if (!prospect.trim()) { setErr('Donne au moins le profil / l’industrie du prospect.'); return; }
    setErr(''); setBusyOpener(true); setOpener('');
    try {
      await streamTo('/api/post-maker/prospect', { mode: 'opener', prospect, service, tone }, (t) =>
        setOpener((p) => p + t)
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setBusyOpener(false);
    }
  }

  async function suggestReply(prospectMsg: string) {
    const nextConv: ChatMsg[] = [...conv, { from: 'prospect', text: prospectMsg }];
    setConv(nextConv);
    setDraft('');
    setSuggestion('');
    setBusyReply(true);
    setErr('');
    let acc = '';
    try {
      await streamTo(
        '/api/post-maker/prospect',
        { mode: 'reply', prospect, service, tone, conversation: nextConv },
        (t) => { acc += t; setSuggestion(acc); }
      );
      setConv((c) => [...c, { from: 'me', text: acc }]);
      setSuggestion('');
      setTimeout(() => convRef.current?.scrollTo({ top: convRef.current.scrollHeight }), 50);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setBusyReply(false);
    }
  }

  return (
    <div className="grid gap-4">
      {/* Profil du prospect + message d'approche */}
      <div className="rounded-2xl border border-line bg-white p-5">
        <label className={labelCls}>Profil du prospect</label>
        <textarea
          className={`${inputCls} min-h-[80px] resize-y`}
          value={prospect}
          onChange={(e) => setProspect(e.target.value)}
          placeholder="Lien du profil, nom, industrie/secteur, ce que tu sais de lui… Ex : gérant d’une boutique de mode à Cotonou, actif sur Instagram."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Ce que tu proposes</label>
            <input className={inputCls} value={service} onChange={(e) => setService(e.target.value)} placeholder="Ex : création de visuels, community management…" />
          </div>
          <div>
            <label className={labelCls}>Ton (optionnel)</label>
            <input className={inputCls} value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Ex : direct, chaleureux, pro…" />
          </div>
        </div>
        {err && <p className="mt-3 text-sm font-medium text-red-600">{err}</p>}
        <button
          onClick={genOpener}
          disabled={busyOpener}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 active:scale-[0.99] disabled:opacity-60 sm:w-auto"
        >
          <IconSparkle width={17} height={17} />
          {busyOpener ? 'Génération…' : opener ? 'Regénérer le message' : 'Générer le message d’approche'}
        </button>

        {(opener || busyOpener) && (
          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-orange-700">Message à envoyer</span>
              {opener && !busyOpener && <CopyButton text={opener} />}
            </div>
            <div className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink">
              {opener}
              {busyOpener && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-orange-400 align-middle" />}
            </div>
          </div>
        )}
      </div>

      {/* Chat de closing */}
      <div className="rounded-2xl border border-line bg-white p-5">
        <h3 className="text-sm font-bold text-ink">Le prospect a répondu ? Colle sa réponse ci-dessous</h3>
        <p className="mt-1 text-xs text-muted">L’IA te propose le message à lui renvoyer pour avancer vers la vente.</p>

        {conv.length > 0 && (
          <div ref={convRef} className="mt-4 max-h-[380px] space-y-3 overflow-y-auto pr-1">
            {conv.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.from === 'me'
                      ? 'bg-orange-500 text-white'
                      : 'bg-black/[0.04] text-ink'
                  }`}
                >
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide opacity-70">
                    {m.from === 'me' ? 'À envoyer' : 'Prospect'}
                  </div>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  {m.from === 'me' && (
                    <div className="mt-2">
                      <CopyButton text={m.text} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busyReply && suggestion && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl bg-orange-500 px-3.5 py-2.5 text-sm leading-relaxed text-white">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide opacity-70">À envoyer</div>
                  <div className="whitespace-pre-wrap">{suggestion}<span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-white/70 align-middle" /></div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-end gap-2">
          <textarea
            className={`${inputCls} min-h-[52px] resize-y`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Colle ici le message du prospect…"
          />
          <button
            onClick={() => draft.trim() && suggestReply(draft.trim())}
            disabled={busyReply || !draft.trim()}
            className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl bg-orange-500 text-white transition hover:bg-orange-600 disabled:opacity-50"
            aria-label="Obtenir une réponse"
          >
            <IconArrowRight width={18} height={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
