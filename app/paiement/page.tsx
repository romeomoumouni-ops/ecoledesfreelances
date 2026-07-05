import type { Metadata } from 'next';
import { headers } from 'next/headers';
import SalesPage from './SalesPage';

export const metadata: Metadata = {
  title: "Rejoindre L'École des Freelances",
  description:
    'Le seul programme d’accompagnement intensif pour devenir freelance IA et atteindre ta liberté financière en moins de 60 jours, même en partant de zéro.',
};

export const dynamic = 'force-dynamic';

export default function PaiementPage() {
  // Pays de l'acheteur détecté via son adresse IP (Vercel) → pré-sélection automatique.
  const detected = (headers().get('x-vercel-ip-country') || '').toUpperCase();
  return <SalesPage detectedCountry={detected} />;
}
