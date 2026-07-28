import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Envoi manuel du mail d'inscription (le même que les acheteurs) à une adresse.
 * Protégé par le token applicatif : ?token=CHARIOW_WEBHOOK_TOKEN&to=email
 * Utile pour l'ajout d'un membre d'équipe (closer, coach…) hors paiement.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CHARIOW_WEBHOOK_TOKEN;
  if (!expected || req.nextUrl.searchParams.get('token') !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const to = (req.nextUrl.searchParams.get('to') ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ ok: false, error: 'Adresse invalide.' }, { status: 400 });
  }
  const sent = await sendWelcomeEmail(to);
  return NextResponse.json({ ok: sent, to });
}
