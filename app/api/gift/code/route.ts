import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailDeliveryStatus, sendGiftCodeEmail } from '@/lib/email';
import { verifierEmail } from '@/lib/email-check';
import { domaineRecoitEmails } from '@/lib/email-domain';

export const dynamic = 'force-dynamic';

const MAUVAISE_ADRESSE =
  'Cette adresse e-mail n’est pas correcte ou n’existe pas. Vérifie-la avec la personne et mets la bonne adresse.';

/**
 * Place offerte, étape 1 : on envoie un code à 6 chiffres à l'adresse de
 * l'invité. Le code ne transite jamais par le navigateur du donneur : il doit
 * le demander à l'invité, ce qui prouve que l'adresse est la bonne.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  let email = '';
  try { email = String((await req.json())?.email ?? '').trim().toLowerCase(); } catch { /* vide */ }
  const v = verifierEmail(email);
  if (v.etat === 'vide') return NextResponse.json({ error: 'Entre une adresse e-mail.' }, { status: 400 });
  if (v.etat === 'invalide') return NextResponse.json({ error: `${v.message} ${MAUVAISE_ADRESSE}` }, { status: 400 });
  if (v.etat === 'suspect') return NextResponse.json({ error: `${v.message} Corrige l’adresse avant de continuer.` }, { status: 400 });
  if (!(await domaineRecoitEmails(email))) {
    return NextResponse.json({ error: `Le domaine « ${email.split('@')[1]} » n’existe pas. ${MAUVAISE_ADRESSE}` }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('gift_request_code', {
    p_secret: process.env.CHARIOW_GRANT_SECRET,
    p_email: email,
  });
  if (error) return NextResponse.json({ error: 'Impossible de préparer le code. Réessaie.' }, { status: 500 });
  const r = data as { ok: boolean; error?: string; code?: string; invitee_email?: string; giver_name?: string };
  if (!r.ok) return NextResponse.json({ error: r.error ?? 'Impossible d’envoyer le code.' }, { status: 400 });

  const sent = await sendGiftCodeEmail(r.invitee_email!, r.giver_name ?? '', r.code!);
  if (!sent.ok) {
    // Panne ou quota du service d'e-mail : ce n'est PAS la faute de l'adresse.
    if (/^(429|5\d\d)\b|RESEND_API_KEY|réseau/.test(sent.error ?? '')) {
      console.error('[gift/code] envoi impossible', sent.error);
      return NextResponse.json(
        { error: 'L’envoi des e-mails est momentanément indisponible. Ta place n’est pas utilisée : réessaie un peu plus tard.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: `Impossible d’envoyer un e-mail à cette adresse. ${MAUVAISE_ADRESSE}` }, { status: 400 });
  }
  if (sent.id) {
    await supabase.rpc('gift_code_set_email_id', { p_secret: process.env.CHARIOW_GRANT_SECRET, p_email_id: sent.id });
  }
  return NextResponse.json({ ok: true, invitee_email: r.invitee_email });
}

/**
 * Suivi de livraison du code : si la messagerie de l'invité le refuse
 * (adresse inexistante), on prévient le donneur tout de suite.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });
  const { data } = await supabase.rpc('gift_code_info', { p_secret: process.env.CHARIOW_GRANT_SECRET });
  const info = data as { invitee_email: string; email_id: string | null } | null;
  if (!info?.email_id) return NextResponse.json({ status: null });
  const status = await emailDeliveryStatus(info.email_id);
  if (status === 'bounced' || status === 'failed') {
    return NextResponse.json({ status, error: `L’adresse ${info.invitee_email} n’existe pas : l’e-mail a été refusé. ${MAUVAISE_ADRESSE}` });
  }
  return NextResponse.json({ status });
}
