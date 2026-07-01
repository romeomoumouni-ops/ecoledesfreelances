export const dynamic = 'force-dynamic';

import { getCourses } from '@/lib/db';
import MesFormationsClient from './MesFormationsClient';

export default async function MesFormationsPage() {
  const courses = await getCourses();
  return <MesFormationsClient courses={courses} />;
}