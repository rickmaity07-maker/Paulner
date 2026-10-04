import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/activity";
import { createSession } from "@/lib/auth";
import { db, hasDatabase } from "@/lib/db";
import { finishGoogleLogin, GOOGLE_STATE_COOKIE } from "@/lib/google";

interface UserRow {
  id: string;
  email: string;
  role: "user" | "owner";
  active: boolean;
  google_sub: string | null;
}

/*
  Google sends the visitor back here. The account is found by its Google id,
  or by the verified email (which links an existing email/password account,
  including the owner's), or created as a new guest account.
*/
export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = () => NextResponse.redirect(new URL("/login?error=google", url), 303);

  const store = await cookies();
  const saved = store.get(GOOGLE_STATE_COOKIE)?.value;
  store.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });
  let flow: { state: string; verifier: string; next: string };
  try {
    flow = JSON.parse(saved ?? "");
  } catch {
    return fail();
  }
  const code = url.searchParams.get("code");
  if (!hasDatabase() || !code || url.searchParams.get("state") !== flow.state) return fail();

  const profile = await finishGoogleLogin(url.origin, code, flow.verifier);
  if (!profile) return fail();

  const sql = db();
  const [existing] = (await sql`
    select id, email, role, active, google_sub from users
    where google_sub = ${profile.sub} or email = ${profile.email}
    order by (google_sub = ${profile.sub}) desc nulls last
    limit 1
  `) as UserRow[];

  let user = existing;
  if (user && !user.active) return fail();
  if (user && user.google_sub !== profile.sub) {
    await sql`update users set google_sub = ${profile.sub} where id = ${user.id}`;
    await logActivity({ id: user.id, email: user.email }, "Google verknüpft", "user", user.id, user.email);
  }
  if (!user) {
    [user] = (await sql`
      insert into users (email, name, password_hash, google_sub)
      values (${profile.email}, ${profile.name.slice(0, 120)}, '', ${profile.sub})
      returning id, email, role, active, google_sub
    `) as UserRow[];
    await logActivity({ id: user.id, email: user.email }, "Konto erstellt", "user", user.id, "Google");
  }

  await sql`update users set last_login_at = now() where id = ${user.id}`;
  await createSession(user.id);
  if (user.role === "owner") await logActivity({ id: user.id, email: user.email }, "Angemeldet (Google)", "user", user.id);
  const destination = flow.next || (user.role === "owner" ? "/admin" : "/profile");
  return NextResponse.redirect(new URL(destination, url), 303);
}
