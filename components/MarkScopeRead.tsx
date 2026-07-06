'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Marque un « scope » comme lu (read_marks) au montage de la page. Utilisé pour
 * faire retomber la pastille de non-lus des onglets Communauté / Témoignages
 * dès que le membre ouvre la page.
 */
export default function MarkScopeRead({ userId, scope }: { userId: string; scope: string }) {
  useEffect(() => {
    const supabase = createClient();
    void supabase.from('read_marks').upsert(
      { user_id: userId, scope, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,scope' },
    );
  }, [userId, scope]);
  return null;
}
