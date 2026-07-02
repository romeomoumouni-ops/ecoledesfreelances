import { createClient } from '@/lib/supabase/client';

/**
 * S'assure que le websocket Realtime porte le token de l'utilisateur connecté.
 * Sans ça, les événements filtrés par RLS n'arrivent jamais (échec silencieux).
 * Idempotent : à appeler avant chaque abonnement ; propage aussi le token aux
 * canaux déjà joints.
 */
export async function ensureRealtimeAuth(): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) await supabase.realtime.setAuth(session.access_token);
}
