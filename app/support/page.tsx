import type { Metadata } from 'next';
import SupportClient from './SupportClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Support accès — L'École des Freelances",
  description: "Tu as payé et tu n'as pas tes accès ? Vérifie ton paiement et reçois tes accès en 1 minute.",
  robots: { index: false },
};

// Page PUBLIQUE : aucun compte requis (cf. PUBLIC_PATHS dans middleware.ts).
export default function SupportPage() {
  return <SupportClient />;
}
