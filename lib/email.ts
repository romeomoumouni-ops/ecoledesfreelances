// Envoi d'e-mails transactionnels via Resend (https://resend.com).
// Si RESEND_API_KEY n'est pas configurée, on ne fait rien (aucune erreur).

const SITE_URL = 'https://www.lecoledesfreelances.com';

function fromAddress(): string {
  return process.env.RESEND_FROM || "L'École des Freelances <onboarding@resend.dev>";
}

/**
 * Envoi d'un e-mail. `scheduledAt` (ISO 8601) confie la livraison à Resend pour
 * plus tard : utile pour préparer un envoi maintenant et le faire arriver à une
 * heure choisie (ex. 9 h au Bénin).
 */
async function send(
  to: string,
  subject: string,
  html: string,
  scheduledAt?: string
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false; // e-mail non configuré : on ignore proprement
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddress(),
        to,
        subject,
        html,
        ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
      }),
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

/** Construit le HTML d'un e-mail de diffusion (message libre écrit par l'admin). */
function broadcastHtml(subject: string, message: string): string {
  const safeBody = escapeHtml(message).replace(/\n/g, '<br/>');
  return confirmTemplate(escapeHtml(subject), safeBody, 'Se connecter sur la plateforme →', SITE_URL);
}

/**
 * Diffusion e-mail à un élève (message libre écrit par l'admin).
 * Le corps est du texte simple : on échappe le HTML et on garde les sauts de ligne.
 */
export async function sendBroadcastEmail(to: string, subject: string, message: string): Promise<boolean> {
  return send(to, subject, broadcastHtml(subject, message));
}

/**
 * Diffusion e-mail à TOUS les élèves via l'API "batch" de Resend
 * (jusqu'à 100 destinataires par requête) → rapide et sans dépasser la limite
 * de débit (2 req/s). Renvoie le nombre envoyés / échoués + la 1re erreur utile.
 */
export async function sendBroadcastBatch(
  recipients: string[],
  subject: string,
  message: string,
  htmlOverride?: string
): Promise<{ sent: number; failed: number; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: 0, failed: recipients.length, error: 'RESEND_API_KEY manquante' };

  const html = htmlOverride ?? broadcastHtml(subject, message);
  const from = fromAddress();
  let sent = 0;
  let failed = 0;
  let firstError: string | undefined;
  const CHUNK = 100; // limite de l'API batch Resend

  for (let i = 0; i < recipients.length; i += CHUNK) {
    const slice = recipients.slice(i, i + CHUNK);
    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(slice.map((to) => ({ from, to, subject, html }))),
      });
      if (res.ok) {
        const json = (await res.json().catch(() => null)) as { data?: unknown[] } | null;
        const n = Array.isArray(json?.data) ? json!.data!.length : slice.length;
        sent += n;
        failed += slice.length - n;
      } else {
        failed += slice.length;
        if (!firstError) {
          const j = (await res.json().catch(() => null)) as { message?: string; name?: string } | null;
          firstError = `${res.status} ${j?.message ?? j?.name ?? ''}`.trim();
        }
      }
    } catch (e) {
      failed += slice.length;
      if (!firstError) firstError = e instanceof Error ? e.message : 'erreur réseau';
    }
    // Petit répit entre deux lots pour rester sous la limite de débit
    if (i + CHUNK < recipients.length) await new Promise((r) => setTimeout(r, 600));
  }
  return { sent, failed, error: firstError };
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

/**
 * Relance des acheteurs qui ont payé mais n'ont JAMAIS créé leur compte.
 * On leur rappelle que leur accès est bien actif et on leur redonne le chemin
 * exact : créer son compte avec l'adresse utilisée pour payer.
 */
export async function sendAccessReminderEmail(
  to: string,
  nom?: string | null,
  scheduledAt?: string
): Promise<boolean> {
  const prenom = (nom ?? '').trim().split(/\s+/)[0] ?? '';
  const bonjour = prenom ? `Bonjour ${escapeHtml(prenom)},` : 'Bonjour,';
  const subject = 'Ton accès t’attend — tu n’as pas encore créé ton compte 👀';
  const html = `
  <div style="margin:0;padding:24px;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #ececeb;border-radius:16px;overflow:hidden;">
      <div style="padding:28px 28px 8px;">
        <div style="font-size:17px;font-weight:700;">L'École des Freelances</div>
      </div>
      <div style="padding:8px 28px 28px;">
        <h1 style="font-size:20px;font-weight:700;margin:12px 0 8px;">Ton accès est actif, mais ton compte n'existe pas encore</h1>
        <p style="font-size:14px;line-height:1.6;color:#4a4a4a;margin:0 0 14px;">
          ${bonjour}<br/><br/>
          Ton paiement pour rejoindre <b>L'École des Freelances</b> a bien été reçu et
          <b>ton accès est activé</b>. Mais on voit que tu ne t'es pas encore connecté(e)
          à la plateforme depuis ton achat.
        </p>
        <div style="background:#f7f7f5;border-radius:12px;padding:14px 16px;margin:16px 0;">
          <p style="font-size:13px;line-height:1.7;color:#1d1d1f;margin:0;">
            <b>Ce qu'il te reste à faire (2 minutes) :</b><br/>
            1️⃣ Clique sur le bouton ci-dessous<br/>
            2️⃣ Crée ton compte avec <b>cette adresse e-mail exactement</b> : ${escapeHtml(to)}<br/>
            3️⃣ Choisis un mot de passe et <b>note-le bien</b><br/><br/>
            🔒 Ton accès s'ouvre automatiquement dès la création du compte.
          </p>
        </div>
        <div style="text-align:center;margin:26px 0 10px;">
          <a href="${SITE_URL}/inscription" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;">
            Créer mon compte maintenant →
          </a>
        </div>
        <p style="font-size:12px;line-height:1.6;color:#8a8a8a;text-align:center;margin:14px 0 0;">
          Tu as déjà un compte ? <a href="${SITE_URL}/connexion" style="color:#4a4a4a;">Connecte-toi ici</a>.<br/>
          Un souci pour entrer ? Réponds simplement à cet e-mail, on s'occupe de toi.
        </p>
      </div>
    </div>
    <p style="max-width:520px;margin:14px auto 0;font-size:11px;color:#a0a0a0;text-align:center;">
      L'École des Freelances — tu reçois cet e-mail car un accès a été activé pour cette adresse.
    </p>
  </div>`;
  return send(to, subject, html, scheduledAt);
}

export type SuspectAddress = {
  adresse_actuelle: string;
  client: string;
  whatsapp: string;
  a_un_compte: boolean;
  correction_proposee: string;
  deja_utilisee: boolean;
};

/**
 * Rapport du lundi envoyé au fondateur : qui a été relancé, et surtout les
 * adresses qui ressemblent à une faute de frappe — avec le WhatsApp du client
 * pour trancher en quelques secondes. Aucune correction n'est faite tout seul.
 */
export type EmailFix = {
  ancienne: string;
  nouvelle: string;
  client: string;
  whatsapp: string;
  avait_un_compte: boolean;
  notifie: boolean;
};

export async function sendWeeklyAccessReport(
  to: string,
  relances: number,
  suspects: SuspectAddress[],
  corriges: EmailFix[] = []
): Promise<boolean> {
  const lignes = suspects
    .map((s) => {
      const wa = s.whatsapp
        ? `<a href="https://wa.me/${s.whatsapp}" style="color:#1d1d1f;font-weight:600;">WhatsApp →</a>`
        : '<span style="color:#a0a0a0;">pas de numéro</span>';
      const etat = s.a_un_compte
        ? '<span style="color:#b45309;">a un compte (ne reçoit aucun e-mail)</span>'
        : '<span style="color:#c2410c;">aucun compte créé</span>';
      const conflit = s.deja_utilisee
        ? '<br/><b style="color:#dc2626;">⚠ l’adresse corrigée est déjà prise — vérifier avant de toucher</b>'
        : '';
      return `<tr><td style="padding:12px 0;border-bottom:1px solid #ececeb;font-size:13px;line-height:1.6;">
        <b>${escapeHtml(s.client || s.adresse_actuelle)}</b> · ${wa}<br/>
        Saisi : <code style="background:#f7f7f5;padding:2px 5px;border-radius:4px;">${escapeHtml(s.adresse_actuelle)}</code><br/>
        Sans doute : <code style="background:#ecfdf5;padding:2px 5px;border-radius:4px;">${escapeHtml(s.correction_proposee)}</code><br/>
        ${etat}${conflit}
      </td></tr>`;
    })
    .join('');

  // Ce qui a été CORRIGÉ automatiquement (fait, pas à faire)
  const lignesFix = corriges
    .map((f) => {
      const wa = f.whatsapp
        ? ` · <a href="https://wa.me/${f.whatsapp}" style="color:#1d1d1f;font-weight:600;">WhatsApp →</a>`
        : '';
      const suite = f.avait_un_compte
        ? 'compte basculé, prévenu(e) à la nouvelle adresse (mot de passe inchangé)'
        : 'accès envoyé à la nouvelle adresse';
      return `<tr><td style="padding:10px 0;border-bottom:1px solid #ececeb;font-size:13px;line-height:1.6;">
        <b>${escapeHtml(f.client || f.nouvelle)}</b>${wa}<br/>
        <code style="background:#fef2f2;padding:2px 5px;border-radius:4px;text-decoration:line-through;">${escapeHtml(f.ancienne)}</code>
        → <code style="background:#ecfdf5;padding:2px 5px;border-radius:4px;">${escapeHtml(f.nouvelle)}</code><br/>
        <span style="color:#047857;">✅ ${suite}${f.notifie ? '' : ' — <b style="color:#dc2626">e-mail non parti, à relancer</b>'}</span>
      </td></tr>`;
    })
    .join('');
  const blocFix = corriges.length
    ? `<h2 style="font-size:15px;font-weight:700;margin:26px 0 6px;">✅ ${corriges.length} adresse(s) corrigée(s) automatiquement</h2>
       <p style="font-size:13px;color:#6a6a6a;margin:0 0 8px;">C'est fait. Rien à faire de ton côté.</p>
       <table style="width:100%;border-collapse:collapse;">${lignesFix}</table>`
    : '';

  // Ce qui n'a PAS pu être corrigé tout seul (adresse corrigée déjà prise)
  const bloc = suspects.length
    ? `<h2 style="font-size:15px;font-weight:700;margin:26px 0 6px;">⚠️ ${suspects.length} cas à trancher toi-même</h2>
       <p style="font-size:13px;color:#6a6a6a;margin:0 0 8px;">L'adresse corrigée existe déjà chez quelqu'un : je n'ai pas touché, pour ne pas fusionner deux comptes à l'aveugle.</p>
       <table style="width:100%;border-collapse:collapse;">${lignes}</table>`
    : corriges.length
    ? ''
    : `<p style="font-size:13px;color:#6a6a6a;margin:22px 0 0;">✅ Aucune adresse mal saisie cette semaine.</p>`;

  const html = `
  <div style="margin:0;padding:24px;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ececeb;border-radius:16px;padding:28px;">
      <div style="font-size:17px;font-weight:700;">L'École des Freelances</div>
      <h1 style="font-size:20px;font-weight:700;margin:14px 0 8px;">Rapport d'accès du lundi</h1>
      <p style="font-size:14px;line-height:1.6;color:#4a4a4a;margin:0;">
        <b>${relances}</b> personne(s) qui avaient payé sans jamais créer leur compte viennent
        d'être relancées automatiquement.
      </p>
      ${blocFix}
      ${bloc}
      <div style="text-align:center;margin:28px 0 4px;">
        <a href="${SITE_URL}/admin/utilisateurs" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:12px;">Ouvrir l'espace admin →</a>
      </div>
    </div>
  </div>`;
  return send(to, `Accès — rapport du lundi : ${relances} relance(s), ${corriges.length} adresse(s) corrigée(s)${suspects.length ? `, ${suspects.length} à trancher` : ''}`, html);
}

/**
 * Adresse corrigée automatiquement : on prévient la personne à sa NOUVELLE
 * adresse (la seule qui reçoit du courrier) que son identifiant de connexion
 * a changé. Le mot de passe est inchangé.
 */
export async function sendEmailCorrectedNotice(
  nouvelle: string,
  ancienne: string,
  nom?: string | null,
  avaitUnCompte = true
): Promise<boolean> {
  const prenom = (nom ?? '').trim().split(/\s+/)[0] ?? '';
  const bonjour = prenom ? `Bonjour ${escapeHtml(prenom)},` : 'Bonjour,';
  const subject = avaitUnCompte
    ? 'Ton adresse e-mail a été corrigée — voici ton nouvel identifiant'
    : 'Ton accès est prêt — ton adresse a été corrigée';
  const corps = avaitUnCompte
    ? `Lors de ton paiement, ton adresse avait été saisie <b>${escapeHtml(ancienne)}</b> — une petite faute de frappe qui t'empêchait de recevoir nos e-mails.<br/><br/>
       Nous l'avons corrigée en <b>${escapeHtml(nouvelle)}</b>.<br/><br/>
       <b>À partir de maintenant, connecte-toi avec cette adresse.</b> Ton mot de passe ne change pas, et tout ce que tu as fait sur la plateforme est conservé.`
    : `Lors de ton paiement, ton adresse avait été saisie <b>${escapeHtml(ancienne)}</b> — une petite faute de frappe.<br/><br/>
       Nous l'avons corrigée en <b>${escapeHtml(nouvelle)}</b> et ton accès est actif.<br/><br/>
       <b>Crée ton compte avec cette adresse exactement</b>, choisis un mot de passe, et tu entres directement dans le programme.`;
  const cta = avaitUnCompte ? 'Me connecter →' : 'Créer mon compte →';
  const href = avaitUnCompte ? `${SITE_URL}/connexion` : `${SITE_URL}/inscription`;
  return send(nouvelle, subject, confirmTemplate(
    avaitUnCompte ? 'Ton identifiant de connexion a changé' : 'Ton accès t’attend',
    `${bonjour}<br/><br/>${corps}`, cta, href));
}

/**
 * Support IA : la personne a payé ET a déjà un compte — on lui rappelle simplement
 * comment entrer (l'adresse exacte de son compte). Le mot de passe ne transite jamais.
 */
export async function sendLoginReminderEmail(to: string): Promise<boolean> {
  const body = `Bonne nouvelle : ton paiement est bien enregistré et <b>ton compte existe déjà</b> avec cette adresse.<br/><br/>
    Pour entrer, connecte-toi avec <b>${escapeHtml(to)}</b> et le mot de passe que tu as choisi à l'inscription.<br/><br/>
    Si tu ne te souviens plus de ton mot de passe, réponds simplement à cet e-mail : l'équipe te le réinitialise.`;
  return send(to, 'Ton accès à L’École des Freelances — comment te connecter', confirmTemplate('Ton compte t’attend ✅', body, 'Me connecter →', `${SITE_URL}/connexion`));
}
