'use client';

import { useState } from 'react';

const COUNTRIES: { code: string; label: string }[] = [
  { code: 'BJ', label: 'Bénin' },
  { code: 'CI', label: 'Côte d’Ivoire' },
  { code: 'SN', label: 'Sénégal' },
  { code: 'TG', label: 'Togo' },
  { code: 'CM', label: 'Cameroun' },
  { code: 'BF', label: 'Burkina Faso' },
  { code: 'ML', label: 'Mali' },
  { code: 'GN', label: 'Guinée' },
  { code: 'NE', label: 'Niger' },
  { code: 'CD', label: 'RD Congo' },
  { code: 'CG', label: 'Congo' },
  { code: 'GA', label: 'Gabon' },
  { code: 'TD', label: 'Tchad' },
];

export default function PostMakerSubscribe({ fallbackUrl }: { fallbackUrl: string }) {
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('BJ');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function pay() {
    if (phone.replace(/\D/g, '').length < 6) {
      setErr('Entre ton numéro Mobile Money.');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const res = await fetch('/api/post-maker/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, country }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr((data as { error?: string }).error || 'Le paiement n’a pas pu démarrer.');
        setBusy(false);
        return;
      }
      const url = (data as { url?: string; fallback?: string }).url || (data as { fallback?: string }).fallback || fallbackUrl;
      if (url) window.location.href = url;
      else { setErr('Lien de paiement indisponible.'); setBusy(false); }
    } catch {
      // En dernier recours, on ouvre la boutique.
      if (fallbackUrl) window.location.href = fallbackUrl;
      else { setErr('Erreur réseau.'); setBusy(false); }
    }
  }

  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Numéro Mobile Money"
          className="w-full rounded-xl border border-orange-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
        />
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full rounded-xl border border-orange-200 bg-white px-3 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </div>
      {err && <p className="mt-2 text-sm font-medium text-red-600">{err}</p>}
      <button
        onClick={pay}
        disabled={busy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-orange-600 active:scale-[0.99] disabled:opacity-60"
      >
        {busy ? 'Redirection vers le paiement…' : 'S’abonner — 15 000 FCFA/mois'}
      </button>
      <p className="mt-3 text-center text-xs text-muted">
        Paiement sécurisé Mobile Money / carte. Déjà payé hors ligne ? Écris à l’équipe via « Contacter les coachs ».
      </p>
    </div>
  );
}
