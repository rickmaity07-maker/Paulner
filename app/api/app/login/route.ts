import { logActivity } from "@/lib/activity";
import { createAppToken } from "@/lib/app-auth";
import { verifyPasswordOrDummy } from "@/lib/auth";
import { db, hasDatabase } from "@/lib/db";

const MAX_FAILURES = 8;

/*
  POST /api/app/login { email, password } -> { token, user }
  Same accounts as the website; only staff and owners may use the tablet.
  Failed attempts share the website's lock-out (8 per 15 minutes per email).
*/
export async function POST(request: Request) {
  if (!hasDatabase()) return Response.json({ code: "unavailable" }, { status: 503 });
  let input: { email?: string; password?: string };
  try {
    input = await request.json();
  } catch {
    return Response.json({ code: "invalid_json" }, { status: 400 });
  }
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  const sql = db();
  const [{ failures }] = (await sql`
    select count(*)::int as failures from login_attempts where email = ${email} and attempted_at > now() - interval '15 minutes'
  `) as { failures: number }[];
  if (failures >= MAX_FAILURES) return Response.json({ code: "too_many" }, { status: 429 });

  const [user] = (await sql`select id, email, name, role, active, password_hash from users where email = ${email}`) as {
    id: string;
    email: string;
    name: string;
    role: string;
    active: boolean;
    password_hash: string;
  }[];
  const valid = await verifyPasswordOrDummy(password, user?.password_hash);
  if (!user || !valid || !user.active) {
    await sql`insert into login_attempts (email) values (${email})`;
    return Response.json({ code: "credentials" }, { status: 401 });
  }
  if (user.role !== "owner" && user.role !== "staff") return Response.json({ code: "no_app_access" }, { status: 403 });

  await sql`delete from login_attempts where email = ${email}`;
  await sql`update users set last_login_at = now() where id = ${user.id}`;
  const token = await createAppToken(user.id);
  await logActivity({ id: user.id, email: user.email }, "Tablet angemeldet", "user", user.id);
  return Response.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}
