export const dynamic = 'force-dynamic';

import { getLeaderboard } from '@/lib/db';
import ClassementClient from './ClassementClient';

export default async function ClassementPage() {
  const rows = await getLeaderboard();
  return <ClassementClient rows={rows} />;
}