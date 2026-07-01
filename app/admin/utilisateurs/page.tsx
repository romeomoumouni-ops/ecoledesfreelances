import { createClient } from '@/lib/supabase/server';
import { setUserAdmin } from '@/lib/admin-actions';
import Avatar from '@/components/Avatar';
import { Badge } from '@/components/UI';

export const dynamic = 'force-dynamic';

function initials(name: string | null, email: string | null) {
  const b = name || email || 'M';
  return b.split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default async function AdminUsersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, is_admin')
    .order('created_at', { ascending: true });

  const list = profiles ?? [];

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-ink">Membres ({list.length})</h1>
      <p className="mb-4 text-sm text-muted">
        Attribuez ou retirez le rôle administrateur. Un admin peut gérer les cours, le live et les membres.
      </p>

      <div className="card divide-y divide-line overflow-hidden">
        {list.map((u) => {
          const isSelf = u.id === user?.id;
          return (
            <div key={u.id} className="flex items-center gap-3 p-4">
              <Avatar initials={initials(u.full_name, u.email)} src={u.avatar_url} size={40} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-semibold text-ink">
                  {u.full_name || u.email}
                  {u.is_admin && <Badge>Admin</Badge>}
                </p>
                <p className="truncate text-xs text-muted">{u.email}</p>
              </div>
              {isSelf ? (
                <span className="text-xs text-muted">Vous</span>
              ) : (
                <form action={setUserAdmin.bind(null, u.id, !u.is_admin)}>
                  <button className={u.is_admin ? 'btn-outline' : 'btn-primary'}>
                    {u.is_admin ? 'Retirer admin' : 'Rendre admin'}
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
