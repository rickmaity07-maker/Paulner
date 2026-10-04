import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, hasDatabase } from "@/lib/db";

const scryptAsync = promisify(scrypt) as (password: string, salt: string, length: number) => Promise<Buffer>;

export const SESSION_COOKIE = "r66_session";
const SESSION_MAX_AGE_S = 60 * 60 * 24 * 5;

export type Role = "user" | "staff" | "owner";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: Role;
}

/* Format: scrypt$<salt hex>$<hash hex>. scripts/setup-db.mjs writes the same format. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

/*
  For logins with an unknown email: run the same scrypt work against a throwaway
  hash, so the answer takes as long as for a real account and timing can't tell
  which addresses are registered.
*/
const DUMMY_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;
export const verifyPasswordOrDummy = async (password: string, stored: string | null | undefined) =>
  verifyPassword(password, stored || DUMMY_HASH).then((ok) => ok && Boolean(stored));

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await scryptAsync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

/* Only a hash of the token is stored, so a leaked sessions table cannot be replayed. */
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const sql = db();
  await sql`
    insert into sessions (token_hash, user_id, expires_at)
    values (${hashToken(token)}, ${userId}, now() + make_interval(secs => ${SESSION_MAX_AGE_S}))
  `;
  await sql`delete from sessions where expires_at < now()`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_S,
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token && hasDatabase()) await db()`delete from sessions where token_hash = ${hashToken(token)}`;
  store.delete(SESSION_COOKIE);
}

/* The role is read from the database on every request, so a demotion or deactivation applies at once. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  if (!hasDatabase()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db()`
    select u.id, u.email, u.name, u.phone, u.role
    from sessions s
    join users u on u.id = s.user_id
    where s.token_hash = ${hashToken(token)} and s.expires_at > now() and u.active
  `;
  return (rows[0] as SessionUser | undefined) ?? null;
});

/* Signs the account out on every other device, keeping this browser's session. */
export async function revokeOtherSessions(userId: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  await db()`delete from sessions where user_id = ${userId} and token_hash <> ${hashToken(token)}`;
}

/* Only paths on this site, so a crafted link cannot send someone elsewhere after login. */
export function safeNext(value: unknown) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "";
}

/* Any signed-in account: the profile page and its actions. */
export async function requireUser(next = "/profile"): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}

/* Guards every admin page and every admin action. */
export async function requireOwner(): Promise<SessionUser> {
  const session = await getSession();
  if (!session || session.role !== "owner") redirect("/login");
  return session;
}

/* Server actions and route handlers in the portal use this name. */
export const requireAdmin = requireOwner;
