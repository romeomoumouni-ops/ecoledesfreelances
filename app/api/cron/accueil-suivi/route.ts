import { NextRequest } from 'next/server';
import { runAccueil } from '@/lib/accueil-cron';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Toutes les 5 min : e-mail « as-tu bien reçu tes accès ? » aux acheteurs d'il y a 5 min et plus. */
export async function GET(req: NextRequest) {
  return runAccueil(req, 'suivi');
}
