import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db, hasDatabase } from "@/lib/db";

/*
  Sign-in for the Deckel tablet app. Same accounts and passwords as the
  website (owners and staff), but the tablet keeps a bearer token instead of a
  cookie. Tokens live in the same sessions table, hashed, for 30 days, so a
  deactivated or demoted account is locked out on its next request.
*/
export type AppRole = "staff" | "owner";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
}

const TOKEN_DAYS = 30;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createAppToken(userId: string) {
  const token = `r66app_${randomBytes(32).toString("base64url")}`;
  const sql = db();
  await sql`
    insert into sessions (token_hash, user_id, expires_at)
    values (${hashToken(token)}, ${userId}, now() + make_interval(days => ${TOKEN_DAYS}))
  `;
  return token;
}

export async function revokeAppToken(token: string) {
  await db()`delete from sessions where token_hash = ${hashToken(token)}`;
}

const bearer = (request: Request) => request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;

export async function appUser(request: Request): Promise<AppUser | null> {
  if (!hasDatabase()) return null;
  const token = bearer(request);
  if (!token) return null;
  const rows = (await db()`
    select u.id, u.email, u.name, u.role
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${hashToken(token)} and s.expires_at > now() and u.active and u.role in ('staff', 'owner')
  `) as AppUser[];
  return rows[0] ?? null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

/*
  Wraps every app endpoint: checks the token (and owner role where needed),
  turns ApiError into a JSON answer and anything else into a logged 500.
*/
export function appRoute<C>(fn: (request: Request, user: AppUser, ctx: C) => Promise<unknown>, { owner = false } = {}) {
  return async (request: Request, ctx: C) => {
    try {
      const user = await appUser(request);
      if (!user) return Response.json({ code: "unauthorized" }, { status: 401 });
      if (owner && user.role !== "owner") return Response.json({ code: "forbidden" }, { status: 403 });
      const result = await fn(request, user, ctx);
      return Response.json(result ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof ApiError) return Response.json({ code: error.code, message: error.message }, { status: error.status });
      console.error("App API error:", error);
      return Response.json({ code: "server" }, { status: 500 });
    }
  };
}

export async function body<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "invalid_json");
  }
}
