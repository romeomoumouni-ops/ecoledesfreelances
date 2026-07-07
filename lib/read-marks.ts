import { createClient } from '@/lib/supabase/server';

/**
 * Marque un « scope » comme lu pour un utilisateur (read_marks), CÔTÉ SERVEUR.
 * Fiable : le client serveur porte toujours la session de la requête. Utilisé
 * quand on ouvre Communauté / Résultats & témoignages pour faire retomber la
 * pastille de non-lus.
 */
export async function markScopeRead(userId: string, scope: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('read_marks')
    .upsert(
      { user_id: userId, scope, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,scope' },
    );
}
