// Envoi d'e-mails transactionnels via Resend (https://resend.com).
// Si RESEND_API_KEY n'est pas configurée, on ne fait rien (aucune erreur).

const SITE_URL = 'https://www.lecoledesfreelances.com';

function fromAddress(): string {
  return process.env.RESEND_FROM || "L'École des Freelances <onboarding@resend.dev>";
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false; // e-mail non configuré : on ignore proprement
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromAddress(), to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Diffusion e-mail à un élève (message libre écrit par l'admin).
 * Le corps est du texte simple : on échappe le HTML et on garde les sauts de ligne.
 */
export async function sendBroadcastEmail(to: string, subject: string, message: string): Promise<boolean> {
  const safeBody = escapeHtml(message).replace(/\n/g, '<br/>');
  const html = confirmTemplate(escapeHtml(subject), safeBody, 'Se connecter sur la plateforme →', SITE_URL);
  return send(to, subject, html);
}

/** E-mail de confirmation d'inscription + bouton « Rejoindre la plateforme ». */
export async function sendWelcomeEmail(to: string): Promise<boolean> {
  const subject = "Votre inscription à L'École des Freelances est confirmée ✅";
  const html = `
  <div style="margin:0;padding:24px;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #ececeb;border-radius:16px;overflow:hidden;">
      <div style="padding:28px 28px 8px;">
        <div style="font-size:17px;font-weight:700;">L'École des Freelances</div>
      </div>
      <div style="padding:8px 28px 28px;">
        <h1 style="font-size:20px;font-weight:700;margin:12px 0 8px;">Bienvenue 🎉 Ton accès est confirmé</h1>
        <p style="font-size:14px;line-height:1.6;color:#4a4a4a;margin:0 0 14px;">
          Ton paiement a bien été reçu et ton accès à <b>L'École des Freelances</b> est activé.
          Il ne te reste plus qu'une étape&nbsp;: <b>créer ton compte</b> pour entrer dans le programme.
        </p>
        <div style="background:#f7f7f5;border-radius:12px;padding:14px 16px;margin:16px 0;">
          <p style="font-size:13px;line-height:1.6;color:#1d1d1f;margin:0;">
            👉 Crée ton compte avec <b>l'adresse e-mail que tu as utilisée pour payer</b> (celle-ci).<br/>
            🔒 <b>Note et conserve bien ton mot de passe</b> — tu en auras besoin à chaque connexion.
          </p>
        </div>
        <div style="text-align:center;margin:26px 0 10px;">
          <a href="${SITE_URL}" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;">
            Rejoindre la plateforme →
          </a>
        </div>
        <p style="font-size:12px;line-height:1.6;color:#8a8a8a;text-align:center;margin:14px 0 0;">
          Si tu as déjà créé ton compte, ce bouton t'amènera directement à ton tableau de bord.
        </p>
      </div>
    </div>
    <p style="max-width:520px;margin:14px auto 0;font-size:11px;color:#a0a0a0;text-align:center;">
      L'École des Freelances — tu reçois cet e-mail car un accès a été activé pour cette adresse.
    </p>
  </div>`;
  return send(to, subject, html);
}

/** Gabarit commun aux e-mails de confirmation de paiement (marque École). */
function confirmTemplate(title: string, body: string, ctaLabel: string, ctaHref: string): string {
  return `
  <div style="margin:0;padding:24px;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #ececeb;border-radius:16px;overflow:hidden;">
      <div style="padding:28px 28px 8px;"><div style="font-size:17px;font-weight:700;">L'École des Freelances</div></div>
      <div style="padding:8px 28px 28px;">
        <h1 style="font-size:20px;font-weight:700;margin:12px 0 8px;">${title}</h1>
        <p style="font-size:14px;line-height:1.6;color:#4a4a4a;margin:0 0 14px;">${body}</p>
        <div style="text-align:center;margin:26px 0 10px;">
          <a href="${ctaHref}" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;">${ctaLabel}</a>
        </div>
      </div>
    </div>
    <p style="max-width:520px;margin:14px auto 0;font-size:11px;color:#a0a0a0;text-align:center;">L'École des Freelances — confirmation de paiement.</p>
  </div>`;
}

/** Confirmation d'une recharge de questions Super Coach (paiement 1 500 FCFA). */
export async function sendCoachRechargeEmail(to: string, remaining: number): Promise<boolean> {
  const subject = 'Ton paiement est confirmé — +15 questions Super Coach ✅';
  const body =
    `Ton paiement a bien été reçu. <b>15 questions</b> ont été ajoutées à ton Super Coach Roméo. ` +
    `Il te reste maintenant <b>${remaining} question${remaining > 1 ? 's' : ''}</b>. Fonce, pose tes questions et avance dans ton projet 💪`;
  return send(to, subject, confirmTemplate('Recharge confirmée 🎉', body, 'Ouvrir le Super Coach →', `${SITE_URL}/super-coach`));
}

/** Confirmation de l'abonnement AI Post Maker (paiement 15 000 FCFA / mois). */
export async function sendPostMakerEmail(to: string, validUntil: string | null): Promise<boolean> {
  const until = validUntil
    ? new Date(validUntil).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const subject = 'Ton abonnement AI Post Maker est activé ✅';
  const body =
    `Ton paiement a bien été reçu et ton accès à <b>AI Post Maker</b> est activé` +
    `${until ? ` <b>jusqu'au ${until}</b>` : ''}. ` +
    `Génère des posts et des messages de prospection à volonté, directement depuis ton espace 🚀`;
  return send(to, subject, confirmTemplate('Abonnement activé 🎉', body, 'Ouvrir AI Post Maker →', `${SITE_URL}/ai-post-maker`));
}
