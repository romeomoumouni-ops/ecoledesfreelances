import { redirect } from 'next/navigation';

// « Résultats et témoignages » vit désormais dans la Communauté (canal dédié).
// Les anciens liens continuent de fonctionner grâce à cette redirection.
export default function TemoignagesPage() {
  redirect('/communaute');
}
