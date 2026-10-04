import UsersManager, { type UserRow } from "@/components/admin/UsersManager";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function UsersPage() {
  const me = await requireOwner();
  const users = (await db()`
    select id, email, name, phone, role, active, google_sub is not null as google, created_at, last_login_at,
      (select count(*)::int from reservations r where r.user_id = users.id) as bookings
    from users order by role desc, active desc, email
  `) as UserRow[];
  return <UsersManager users={users.map((u) => ({ ...u, created_at: new Date(u.created_at).toISOString(), last_login_at: u.last_login_at ? new Date(u.last_login_at).toISOString() : null }))} meId={me.id} />;
}
