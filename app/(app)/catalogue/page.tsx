export const dynamic = 'force-dynamic';

import { getCourses } from '@/lib/db';
import CatalogueClient from './CatalogueClient';

export default async function CataloguePage() {
  const courses = await getCourses();
  return <CatalogueClient courses={courses} />;
}
