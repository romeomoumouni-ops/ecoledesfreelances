'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/UI';
import { IconMegaphone, IconMail, IconX } from '@/components/Icons';
import {
  broadcastPlatform,
  broadcastEmail,
  deleteAnnouncement,
  resendLastBroadcastEmail,
  sendTestEmail,
} from './actions';

export type SentAnnouncement = {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
};

type Tab = 'platform' | 'mail';

export default function MessagerieClient({
  studentCount,
  recent,
}: {
  studentCount: number;
  recent: SentAnnouncement[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('platform');

  // Plateforme
  const [pTitle, setPTitle] = useState('');
  const [pBody, setPBody] = useState('');
  // Mail
  const [mSubject, setMSubject] = useState('');
  const [mBody, setMBody] = useState('');

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Diagnostic e-mail
  const [testTo, setTestTo] = useState('');
  const [testOut, setTestOut] = useState<{ ok: boolean; info: string } | null>(null);

  async function runTest() {
    if (!testTo.trim() || busy) return;
    setBusy(true);
    setTestOut(null);
    const res = await sendTestEmail(testTo);
    setTestOut(res);
    setBusy(false);
  }

  async function sendPlatform() {
    if (!pBody.trim() || busy) return;
    if (!confirm(`Envoyer ce message dans la boîte de réception de ${studentCount} élève(s) ?`)) return;
    setBusy(true);
    setFeedback(null);
    const res = await broadcastPlatform(pTitle, pBody);
    setBusy(false);
    if (res.ok) {
      setFeedback({ ok: true, text: 'Message envoyé sur la plateforme à tous les élèves ✅' });
      setPTitle('');
      setPBody('');
      router.refresh();
    } else {
      setFeedback({ ok: false, text: res.error || "Échec de l'envoi." });
    }
  }

  async function sendMail() {
    if (!mSubject.trim() || !mBody.trim() || busy) return;
    if (!confirm(`Envoyer cet e-mail à tous les élèves (${studentCount}) ET le déposer dans leur messagerie au nom de Mariane ?`)) return;
    setBusy(true);
    setFeedback(null);
    const res = await broadcastEmail(mSubject, mBody);
    setBusy(false);
    if (res.ok) {
      setFeedback({
        ok: !res.warning,
        text:
          `E-mail envoyé à ${res.sent}/${res.total} élève(s) ✅ — et déposé dans la messagerie de ${res.inbox} élève(s) au nom de Mariane.` +
          (res.warning ? `\n\n⚠️ ${res.warning}` : ''),
      });
      setMSubject('');
      setMBody('');
    } else {
      setFeedback({ ok: false, text: res.error || "Échec de l'envoi." });
    }
  }

  async function resendLast() {
    if (busy) return;
    if (
      !confirm(
        `Renvoyer le DERNIER e-mail à tous les élèves (${studentCount}) — e-mail uniquement, sans re-poster dans la messagerie ?\n\n` +
          `Sert à rattraper les envois qui avaient échoué. Ceux qui l'ont déjà reçu auront un doublon.`
      )
    )
      return;
    setBusy(true);
    setFeedback(null);
    const res = await resendLastBroadcastEmail();
    setBusy(false);
    if (res.ok) {
      setFeedback({
        ok: !res.warning,
        text:
          `Renvoi terminé : e-mail envoyé à ${res.sent}/${res.total} élève(s) ✅ (aucun nouveau message dans la messagerie).` +
          (res.warning ? `\n\n⚠️ ${res.warning}` : ''),
      });
    } else {
      setFeedback({ ok: false, text: res.error || 'Échec du renvoi.' });
    }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce message de la plateforme ?')) return;
    const res = await deleteAnnouncement(id);
    if (res.ok) router.refresh();
    else alert(res.error || 'Échec de la suppression.');
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Messagerie"
        subtitle="Envoie un message groupé à tous les élèves — sur la plateforme ou par e-mail."
      />

      {/* Onglets */}
      <div className="mb-5 inline-flex rounded-xl border border-line bg-white p-1">
        <button
          onClick={() => setTab('platform')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === 'platform' ? 'bg-ink text-white' : 'text-muted hover:text-ink'
          }`}
        >
          <IconMegaphone width={17} height={17} /> Plateforme
        </button>
        <button
          onClick={() => setTab('mail')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === 'mail' ? 'bg-ink text-white' : 'text-muted hover:text-ink'
          }`}
        >
          <IconMail width={17} height={17} /> E-mail
        </button>
      </div>

      {feedback && (
        <p
          className={`mb-4 whitespace-pre-line rounded-lg px-3 py-2 text-sm font-medium ${
            feedback.ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {feedback.text}
        </p>
      )}

      {/* Formulaire Plateforme */}
      {tab === 'platform' && (
        <div className="card p-5">
          <p className="mb-4 text-sm text-muted">
            Ce message apparaîtra dans les <b>notifications</b> (icône cloche) de{' '}
            <b>{studentCount}</b> élève(s), en temps réel.
          </p>
          <label className="label">Titre (facultatif)</label>
          <input
            value={pTitle}
            onChange={(e) => setPTitle(e.target.value)}
            className="input mb-3"
            placeholder="Ex : Nouveau live ce soir à 20h"
          />
          <label className="label">Message</label>
          <textarea
            value={pBody}
            onChange={(e) => setPBody(e.target.value)}
            className="input min-h-[130px]"
            placeholder="Écris ton annonce à tous les élèves…"
          />
          <button
            onClick={sendPlatform}
            disabled={busy || !pBody.trim()}
            className="btn-primary mt-4 disabled:opacity-60"
          >
            {busy ? 'Envoi…' : 'Envoyer sur la plateforme'}
          </button>
        </div>
      )}

      {/* Formulaire E-mail */}
      {tab === 'mail' && (
        <div className="card p-5">
          <p className="mb-4 text-sm text-muted">
            Un e-mail sera envoyé à l&apos;adresse de <b>{studentCount}</b> élève(s) via L&apos;École des
            Freelances. <b>Le même message apparaîtra aussi dans leur messagerie</b>, comme s&apos;il venait
            de <b>Mariane</b> (assistante de M. Roméo).
          </p>
          <label className="label">Sujet</label>
          <input
            value={mSubject}
            onChange={(e) => setMSubject(e.target.value)}
            className="input mb-3"
            placeholder="Ex : Une info importante pour toi"
          />
          <label className="label">Message</label>
          <textarea
            value={mBody}
            onChange={(e) => setMBody(e.target.value)}
            className="input min-h-[160px]"
            placeholder="Écris ton e-mail… (les sauts de ligne sont conservés)"
          />
          <button
            onClick={sendMail}
            disabled={busy || !mSubject.trim() || !mBody.trim()}
            className="btn-primary mt-4 disabled:opacity-60"
          >
            {busy ? 'Envoi en cours…' : 'Envoyer par e-mail à tous'}
          </button>

          {/* Diagnostic : test d'envoi à une adresse + réponse brute de Resend */}
          <div className="mt-6 rounded-xl border border-line bg-black/[0.02] p-4">
            <p className="text-sm font-semibold text-ink">Tester l&apos;envoi</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Envoie un e-mail de test à une adresse (la tienne) pour vérifier que la livraison
              fonctionne. Le résultat affiche la réponse exacte de Resend.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="ton@email.com"
                className="input"
              />
              <button onClick={runTest} disabled={busy || !testTo.trim()} className="btn-outline shrink-0 disabled:opacity-60">
                {busy ? 'Test…' : "Envoyer un test"}
              </button>
            </div>
            {testOut && (
              <pre
                className={`mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg p-3 text-xs ${
                  testOut.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
                }`}
              >
                {testOut.info}
              </pre>
            )}
          </div>

          {/* Rattrapage : renvoyer le dernier e-mail (sans re-poster dans la messagerie) */}
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-sm font-semibold text-ink">Rattrapage d&apos;un envoi</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Un précédent e-mail n&apos;a pas atteint tout le monde ? Renvoie <b>le dernier e-mail</b> à tous
              les élèves — <b>e-mail uniquement</b>, sans recréer de message dans la messagerie. Ceux qui
              l&apos;ont déjà reçu auront un doublon.
            </p>
            <button
              onClick={resendLast}
              disabled={busy}
              className="btn-outline mt-3 disabled:opacity-60"
            >
              {busy ? 'Renvoi en cours…' : 'Renvoyer le dernier e-mail à tous'}
            </button>
          </div>
        </div>
      )}

      {/* Historique des messages plateforme */}
      {recent.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            Derniers messages plateforme
          </h2>
          <div className="space-y-3">
            {recent.map((a) => (
              <div key={a.id} className="card flex items-start gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-600">
                  <IconMegaphone width={18} height={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{a.title || 'Annonce'}</p>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-sm text-muted">{a.body}</p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(a.created_at).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => remove(a.id)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
                  aria-label="Supprimer"
                >
                  <IconX width={16} height={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
