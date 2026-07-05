import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Admin : accorde (ou révoque) l'accès AI Post Maker à un e-mail. */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const { data: prof } = await supabase
    .from('profiles')
    .select('is_admin, is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!prof?.is_admin && !prof?.is_super_admin) {
    return NextResponse.json({ error: 'Réservé aux administrateurs.' }, { status: 403 });
  }

  let body: { email?: string; months?: number; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Adresse e-mail invalide.' }, { status: 400 });
  }

  const mapError = (msg?: string) => {
    if (msg?.includes('user_not_found')) return 'Aucun compte avec cet e-mail (la personne doit d’abord créer son compte).';
    if (msg?.includes('forbidden')) return 'Réservé aux administrateurs.';
    if (msg?.includes('bad_months')) return 'Nombre de mois invalide (1 à 24).';
    return msg || 'Erreur.';
  };

  if (body.action === 'revoke') {
    const { error } = await supabase.rpc('admin_revoke_post_maker', { p_email: email });
    if (error) return NextResponse.json({ error: mapError(error.message) }, { status: 400 });
    return NextResponse.json({ ok: true, revoked: true });
  }

  const months = Math.max(1, Math.min(24, Math.round(Number(body.months) || 1)));
  const { data, error } = await supabase.rpc('admin_grant_post_maker', { p_email: email, p_months: months });
  if (error) return NextResponse.json({ error: mapError(error.message) }, { status: 400 });
  return NextResponse.json({ ok: true, ...(data as object) });
}
