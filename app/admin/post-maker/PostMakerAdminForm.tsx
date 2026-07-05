'use client';

import { useState } from 'react';

export default function PostMakerAdminForm() {
  const [email, setEmail] = useState('');
  const [months, setMonths] = useState(1);
  const [busy, setBusy] = useState<null | 'grant' | 'revoke'>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(action: 'grant' | 'revoke') {
    if (!email.trim()) { setMsg({ ok: false, text: 'Saisis un e-mail.' }); return; }
    setBusy(action); setMsg(null);
    try {
      const res = await fetch('/api/admin/post-maker-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), months, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ ok: false, text: data.error || 'Erreur.' }); return; }
      if (action === 'revoke') {
        setMsg({ ok: true, text: `Accès AI Post Maker retiré pour ${email.trim()}.` });
      } else {
        const until = data.valid_until ? new Date(data.valid_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        setMsg({ ok: true, text: `Accès accordé à ${email.trim()} jusqu'au ${until}.` });
      }
    } catch {
      setMsg({ ok: false, text: 'Erreur réseau.' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <label className="mb-1.5 block text-sm font-semibold text-ink">E-mail de l&apos;élève</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="eleve@exemple.com"
        className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
      />
      <label className="mb-1.5 mt-4 block text-sm font-semibold text-ink">Durée</label>
      <select
        value={months}
        onChange={(e) => setMonths(Number(e.target.value))}
        className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
      >
        {[1, 2, 3, 6, 12].map((m) => (
          <option key={m} value={m}>{m} mois</option>
        ))}
      </select>
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => send('grant')} disabled={busy !== null}
          className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60">
          {busy === 'grant' ? 'Activation…' : 'Activer / prolonger'}
        </button>
        <button onClick={() => send('revoke')} disabled={busy !== null}
          className="inline-flex items-center justify-center rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-black/[0.03] disabled:opacity-60">
          {busy === 'revoke' ? 'Retrait…' : "Retirer l'accès"}
        </button>
      </div>
      {msg && (
        <p className={`mt-4 text-sm font-medium ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>
          {msg.ok ? '✅ ' : '⛔ '}{msg.text}
        </p>
      )}
    </div>
  );
}
