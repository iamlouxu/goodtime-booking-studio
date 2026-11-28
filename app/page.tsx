import Studio from './studio';
import { getSessionUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await getSessionUser();
  return <Studio signedIn={!!user} />;
}
