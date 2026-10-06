"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { createSession, destroySession, getSession, hashPassword, safeNext, verifyPasswordOrDummy } from "@/lib/auth";
import { db, hasDatabase } from "@/lib/db";

export type LoginError = "credentials" | "emailInUse" | "email" | "password" | "tooMany" | "unavailable";
export interface LoginState {
  error: LoginError | null;
  email: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FAILURES = 8;
const WINDOW = "15 minutes";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: "user" | "owner";
  active: boolean;
}

/* Owners go to the admin portal, everyone else to their profile, unless they came from somewhere. */
const destination = (role: string, next: string) => next || (role === "owner" ? "/admin" : "/profile");

/* Sign in and sign up share one form; the submit button's name picks the mode. */
export async function authenticate(_previous: LoginState, form: FormData): Promise<LoginState> {
  const mode = form.get("mode") === "signup" ? "signup" : "signin";
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const next = safeNext(form.get("next"));

  if (!hasDatabase()) return { error: "unavailable", email };
  if (!EMAIL.test(email)) return { error: "email", email };

  const sql = db();
  const [{ failures }] = (await sql`
    select count(*)::int as failures from login_attempts
    where email = ${email} and attempted_at > now() - ${WINDOW}::interval
  `) as { failures: number }[];
  if (failures >= MAX_FAILURES) return { error: "tooMany", email };

  let user: UserRow | undefined;

  if (mode === "signup") {
    if (password.length < 8) return { error: "password", email };
    const created = (await sql`
      insert into users (email, name, password_hash)
      values (${email}, ${name}, ${await hashPassword(password)})
      on conflict (email) do nothing
      returning id, email, password_hash, role, active
    `) as UserRow[];
    user = created[0];
    if (!user) return { error: "emailInUse", email };
    await logActivity({ id: user.id, email }, "Konto erstellt", "user", user.id, email);
  } else {
    const rows = (await sql`
      select id, email, password_hash, role, active from users where email = ${email}
    `) as UserRow[];
    const candidate = rows[0];
    const valid = await verifyPasswordOrDummy(password, candidate?.password_hash);
    if (!candidate || !valid || !candidate.active) {
      await sql`insert into login_attempts (email) values (${email})`;
      return { error: "credentials", email };
    }
    user = candidate;
  }

  await sql`delete from login_attempts where email = ${email}`;
  await sql`update users set last_login_at = now() where id = ${user.id}`;
  await createSession(user.id);
  if (user.role === "owner") await logActivity({ id: user.id, email: user.email }, "Angemeldet", "user", user.id);
  redirect(destination(user.role, next));
}

/* Ends the session without navigating; the homepage nav reloads itself afterwards. */
export async function endSession() {
  const session = await getSession();
  await destroySession();
  if (session) await logActivity(session, "Abgemeldet", "user", session.id);
}

export async function signOut() {
  await endSession();
  redirect("/");
}
