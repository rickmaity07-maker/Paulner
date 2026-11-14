import "server-only";
import { createHmac } from "node:crypto";
import { db, hasDatabase } from "@/lib/db";
import { RateLimiter, type Rule } from "@/lib/rate-limit";

/*
  The rate limit, shared by every server instance: one row per endpoint and
  caller in Postgres, counted in a single upsert. The caller's IP address is
  never stored, only a keyed hash of it (CRON_SECRET is the key), and the daily
  clean-up deletes rows older than a day.

  If the database can't be reached, each instance falls back to counting in
  memory, so a database hiccup never locks everybody out.
*/
const memory = new RateLimiter();
let warned = false;

export const callerKey = (rule: Rule, ip: string) =>
  `${rule.name}:${createHmac("sha256", process.env.CRON_SECRET || "paulaner-rate-limit").update(ip).digest("base64url").slice(0, 22)}`;

/* Returns the seconds to wait when the limit is used up, otherwise 0. */
export async function take(rule: Rule, ip: string): Promise<number> {
  const key = callerKey(rule, ip);
  if (!hasDatabase()) return memory.take(key, rule);
  const windowSeconds = Math.round(rule.windowMs / 1000);
  try {
    const [row] = (await db()`
      insert into rate_limits as r (key, window_start, hits) values (${key}, now(), 1)
      on conflict (key) do update set
        hits = case when r.window_start <= now() - make_interval(secs => ${windowSeconds}) then 1 else r.hits + 1 end,
        window_start = case when r.window_start <= now() - make_interval(secs => ${windowSeconds}) then now() else r.window_start end
      returning hits, ceil(extract(epoch from (window_start + make_interval(secs => ${windowSeconds}) - now())))::int as wait
    `) as { hits: number; wait: number }[];
    return row.hits > rule.limit ? Math.max(1, row.wait) : 0;
  } catch (error) {
    // Once per instance is enough to notice (e.g. `npm run db:setup` not yet run for the rate_limits table).
    if (!warned) console.error("Shared rate limit unavailable, counting in memory:", error);
    warned = true;
    return memory.take(key, rule);
  }
}
