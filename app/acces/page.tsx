import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/user';
import { createClient } from '@/lib/supabase/server';
import AccessBlocked, { type AccessState } from '@/components/AccessBlocked';

export const dynamic = 'force-dynamic';

/**
 * Page de blocage d'accès (paiement requis / échéance à régler).
 * Volontairement HORS du groupe (app) : elle ne rend ni la navigation ni
 * aucune donnée du programme — rien à extraire pour un compte bloqué.
 */
export default async function AccesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');

  const supabase = createClient();
  const { data: access } = await supabase.rpc('get_my_access');
  const a = (access ?? { active: false, reason: 'no_purchase' }) as {
    active: boolean;
    reason: string;
    plan?: string;
    payments_count?: number;
    total_payments?: number;
  };

  if (a.active) redirect('/tableau-de-bord');

  const state: AccessState = {
    reason: a.reason === 'banned' ? 'banned' : a.reason === 'expired' ? 'expired' : 'no_purchase',
    plan: a.plan,
    payments_count: a.payments_count,
    total_payments: a.total_payments,
  };

  return <AccessBlocked email={profile.email} state={state} />;
}
