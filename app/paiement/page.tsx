import type { Metadata } from 'next';
import SalesPage from './SalesPage';

export const metadata: Metadata = {
  title: "Rejoindre L'École des Freelances",
  description:
    'Le seul programme d’accompagnement intensif pour devenir freelance IA et atteindre ta liberté financière en moins de 60 jours, même en partant de zéro.',
};

export const dynamic = 'force-dynamic';

export default function PaiementPage() {
  return <SalesPage />;
}
