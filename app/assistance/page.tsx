import type { Metadata } from 'next';
import AssistanceClient from './AssistanceClient';

export const metadata: Metadata = {
  title: "Assistant d'accès",
  description: "Tu as payé ? Vérifie ton paiement et reçois les consignes pour entrer sur la plateforme.",
  robots: { index: false },
};

// Page PUBLIQUE : aucun compte requis (cf. PUBLIC_PATHS dans middleware.ts).
export default function AssistancePage() {
  return <AssistanceClient />;
}
