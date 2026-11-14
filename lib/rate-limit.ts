/*
  A small per-IP limiter for the endpoints a script would hammer: sign-in and
  sign-up, the tablet login, booking requests and the data export. The
  per-email lock-out in the login actions stops guessing one password; this
  stops one address trying many accounts, or creating hundreds of them.

  Counts live in memory, so each server instance keeps its own. That is
  enough to blunt a script; it is not a hard global quota.
*/
export interface Rule {
  name: string;
  limit: number;
  windowMs: number;
}

const TEN_MINUTES = 10 * 60 * 1000;

export function ruleFor(method: string, pathname: string, isServerAction: boolean): Rule | null {
  if (pathname === "/login" && method === "POST" && isServerAction) return { name: "login", limit: 20, windowMs: TEN_MINUTES };
  if (pathname === "/api/app/login" && method === "POST") return { name: "app-login", limit: 20, windowMs: TEN_MINUTES };
  if (pathname === "/api/book" && method === "POST") return { name: "book", limit: 20, windowMs: TEN_MINUTES };
  if (pathname.startsWith("/api/auth/google")) return { name: "google", limit: 30, windowMs: TEN_MINUTES };
  if (pathname === "/api/profile/export") return { name: "export", limit: 10, windowMs: TEN_MINUTES };
  return null;
}

/* Vercel puts the caller's address first in x-forwarded-for and in x-real-ip. */
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "unknown";
}

const MAX_KEYS = 10_000;

export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  /* Returns the seconds to wait when the limit is used up, otherwise 0. */
  take(key: string, rule: Rule, now = Date.now()) {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (this.hits.size >= MAX_KEYS) this.sweep(now);
      this.hits.set(key, { count: 1, resetAt: now + rule.windowMs });
      return 0;
    }
    entry.count++;
    return entry.count > rule.limit ? Math.ceil((entry.resetAt - now) / 1000) : 0;
  }

  /* Drops expired entries, and if a flood of addresses still fills the map, starts over. */
  private sweep(now: number) {
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
    if (this.hits.size >= MAX_KEYS) this.hits.clear();
  }

  get size() {
    return this.hits.size;
  }
}
