import { NextRequest } from 'next/server';
import { runAccueil } from '@/lib/accueil-cron';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Chaque lundi à midi (heure du Bénin) : e-mail chaleureux aux nouveaux élèves de la semaine. */
export async function GET(req: NextRequest) {
  return runAccueil(req, 'lundi');
}
