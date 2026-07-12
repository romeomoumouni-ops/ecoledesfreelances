import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { sendBroadcastBatch } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * E-mail de motivation du LUNDI MATIN (cron Vercel, cf. vercel.json).
 * Envoyé à TOUS les comptes (étudiants + admins) : un boost différent chaque
 * semaine + rappel d'interagir CHAQUE JOUR dans la Communauté, avec bouton.
 *
 * Sécurité : accepte le header du cron Vercel (Bearer CRON_SECRET) ou
 * ?token=CHARIOW_WEBHOOK_TOKEN pour un déclenchement/test manuel.
 * Test sans spammer : ajouter &to=email@exemple.com (envoi à cette adresse seule).
 */

const SITE = 'https://www.lecoledesfreelances.com';

// Une variante par semaine (rotation sur le numéro de semaine ISO).
const BOOSTS: { subject: string; title: string; body: string }[] = [
  {
    subject: '🔥 Nouvelle semaine, nouvelles victoires',
    title: 'C’est lundi : on repart à l’attaque 💪',
    body: 'Une nouvelle semaine commence, et elle appartient à ceux qui passent à l’action. Fixe-toi UN objectif clair cette semaine (un cours à finir, 20 prospects à contacter, un portfolio à améliorer) et tiens-le.',
  },
  {
    subject: '💡 Ton petit pas du jour compte plus que tu ne le crois',
    title: 'Les petits pas de chaque jour font les grandes réussites',
    body: 'Un service créé, un message de prospection envoyé, une vidéo terminée… ce sont ces petits pas quotidiens qui, mis bout à bout, changent une vie de freelance. Fais ton petit pas aujourd’hui — et raconte-le.',
  },
  {
    subject: '🚀 Cette semaine, montre-nous ce que tu fais',
    title: 'Ne travaille pas dans ton coin !',
    body: 'Les freelances qui réussissent le plus vite sont ceux qui montrent leur travail et demandent des retours. Partage une réalisation, même imparfaite : la communauté est là pour te faire progresser, pas pour te juger.',
  },
  {
    subject: '🏆 Ton premier (ou prochain) client est plus proche que tu ne le penses',
    title: 'Chaque action te rapproche de ton prochain client',
    body: 'Relance tes prospects, peaufine ton profil ComeUp, applique ce que tu as vu dans les cours. Et surtout : viens raconter où tu en es — un conseil de la communauté peut débloquer ta semaine.',
  },
  {
    subject: '⚡ L’énergie du groupe, c’est ton carburant',
    title: 'Seul on va vite, ensemble on va loin',
    body: 'Cette semaine, prends 2 minutes par jour pour encourager un autre membre, commenter une victoire, poser ta question. Ce que tu donnes à la communauté te revient toujours multiplié.',
  },
  {
    subject: '🎯 Un conseil : termine ce que tu as commencé',
    title: 'La discipline bat le talent',
    body: 'Ce cours que tu as mis en pause, cette tâche de ton Objectif restée décochée… c’est la semaine pour les terminer. Et quand c’est fait, viens le dire — on célèbre chaque victoire, même les petites.',
  },
  {
    subject: '🌱 Ta progression de la semaine commence maintenant',
    title: 'Compare-toi à celui que tu étais lundi dernier',
    body: 'Pas besoin d’aller plus vite que les autres : avance juste un peu plus que la semaine passée. Un chapitre de plus, un prospect de plus, un post de plus. Viens partager ta progression, ça inspire tout le monde.',
  },
  {
    subject: '💬 On veut de tes nouvelles !',
    title: 'La communauté n’attend que toi',
    body: 'Qu’as-tu fait ces derniers jours ? Une affiche, un texte de vente, un profil amélioré, un premier contact client ? Poste-le dans la Communauté aujourd’hui — les retours des coachs et des membres valent de l’or.',
  },
  {
    subject: '🧠 Applique, ne fais pas que regarder',
    title: 'Le savoir ne paie que quand on l’applique',
    body: 'Regarder les cours c’est bien, appliquer c’est mieux. Choisis UNE leçon cette semaine et mets-la en pratique dès aujourd’hui. Puis montre le résultat à la communauté : c’est comme ça qu’on ancre une compétence.',
  },
  {
    subject: '🔑 La régularité est ta plus grande force',
    title: 'Reviens chaque jour, même 15 minutes',
    body: 'Le secret des membres qui décrochent des clients ? Ils se connectent un peu CHAQUE JOUR : un cours, un commentaire, une action de prospection. 15 minutes par jour battront toujours 5 heures une fois par mois.',
  },
  {
    subject: '🙌 Ta victoire peut débloquer quelqu’un d’autre',
    title: 'Partage tes wins, petits ou grands',
    body: 'Ton premier avis client, ta première commande, ton service enfin en ligne… Ce qui te paraît « petit » peut être exactement ce qui redonnera espoir à un autre membre. Publie ta victoire dans « Vos victoires du jour » !',
  },
  {
    subject: '🛠️ Semaine de construction : bâtis ta preuve',
    title: 'Construis quelque chose à montrer cette semaine',
    body: 'Les clients achètent des preuves. Cette semaine, crée UNE réalisation à ajouter à ton portfolio (même fictive) et publie-la dans Résultats & témoignages ou dans la Communauté pour avoir des retours.',
  },
];

/** Numéro de semaine ISO — fait tourner les messages sans rien stocker. */
function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function boostHtml(title: string, body: string): string {
  return `
  <div style="margin:0;padding:24px;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #ececeb;border-radius:16px;overflow:hidden;">
      <div style="padding:28px 28px 8px;">
        <div style="font-size:17px;font-weight:700;">L'École des Freelances</div>
      </div>
      <div style="padding:8px 28px 28px;">
        <h1 style="font-size:20px;font-weight:700;margin:12px 0 10px;">${title}</h1>
        <p style="font-size:14px;line-height:1.7;color:#4a4a4a;margin:0 0 14px;">${body}</p>
        <div style="background:#f7f7f5;border-radius:12px;padding:14px 16px;margin:18px 0;">
          <p style="font-size:13px;line-height:1.7;color:#1d1d1f;margin:0;">
            📌 <b>Le réflexe qui change tout</b> : connecte-toi <b>chaque jour</b>, même 15 minutes.
            Partage tes petits wins, tes travaux, tes questions dans la <b>Communauté</b> —
            et tes réussites dans <b>Résultats &amp; témoignages</b>. C'est ensemble qu'on avance.
          </p>
        </div>
        <div style="text-align:center;margin:24px 0 6px;">
          <a href="${SITE}/communaute" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;">
            Ouvrir la communauté →
          </a>
        </div>
        <p style="font-size:12px;line-height:1.6;color:#8a8a8a;text-align:center;margin:12px 0 0;">
          Bonne semaine, et à tout de suite sur la plateforme 💪<br/>Roméo &amp; toute l'équipe
        </p>
      </div>
    </div>
    <p style="max-width:520px;margin:14px auto 0;font-size:11px;color:#a0a0a0;text-align:center;">
      L'École des Freelances — e-mail hebdomadaire de motivation envoyé aux membres.
    </p>
  </div>`;
}

function authorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true; // cron Vercel
  const token = req.nextUrl.searchParams.get('token');
  return !!process.env.CHARIOW_WEBHOOK_TOKEN && token === process.env.CHARIOW_WEBHOOK_TOKEN;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const pick = BOOSTS[isoWeek(new Date()) % BOOSTS.length];
  const html = boostHtml(pick.title, pick.body);

  // Test sans spammer : ?to=adresse -> envoi à cette adresse uniquement
  const testTo = req.nextUrl.searchParams.get('to');
  if (testTo) {
    const r = await sendBroadcastBatch([testTo.toLowerCase()], `[TEST] ${pick.subject}`, pick.body, html);
    return NextResponse.json({ ok: true, mode: 'test', to: testTo, ...r, semaine: pick.subject });
  }

  // Tous les comptes (étudiants + admins), via RPC protégée par secret
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data, error } = await supabase.rpc('cron_all_member_emails', {
    p_secret: process.env.CHARIOW_GRANT_SECRET,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const emails = (data as string[] | null) ?? [];
  if (!emails.length) return NextResponse.json({ ok: true, sent: 0, note: 'aucun destinataire' });

  const r = await sendBroadcastBatch(emails, pick.subject, pick.body, html);
  console.log(`weekly-boost: ${r.sent} envoyés, ${r.failed} échecs (${pick.subject})`);
  return NextResponse.json({ ok: true, total: emails.length, ...r, semaine: pick.subject });
}
