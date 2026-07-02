export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/user';
import ContactClient from './ContactClient';

export default async function ContactPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/connexion');

  return <ContactClient me={{ id: profile.id, name: profile.full_name }} />;
}
