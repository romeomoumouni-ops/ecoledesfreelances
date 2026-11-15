import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/user';
import OnboardingModal from '@/components/OnboardingModal';

export const dynamic = 'force-dynamic';

/** Aperçu (super admin) du questionnaire tel que le voit un nouvel élève. Rien n'est enregistré. */
export default async function ApercuQuestionnairePage() {
  const profile = await getCurrentProfile();
  if (!profile?.is_super_admin) redirect('/admin');
  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-ink">Aperçu du questionnaire d&apos;accueil</h1>
      <p className="text-sm text-muted">C&apos;est exactement ce que voit un nouvel élève à sa première connexion. Ici rien n&apos;est enregistré.</p>
      <OnboardingModal userId={profile.id} firstName={profile.full_name.split(' ')[0]} preview />
    </>
  );
}
