import { describe, expect, it } from "vitest";
import { callerKey, take } from "@/lib/rate-limit-store";
import { purgeExpiredData } from "@/lib/retention";
import { testDb } from "../support/pglite-db";

/* The shared rate limit in Postgres: one counter for every server instance. */
const rule = { name: "login", limit: 3, windowMs: 10 * 60 * 1000 };

describe("shared rate limit", () => {
  it("counts across calls and blocks over the limit", async () => {
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await take(rule, "203.0.113.7"));
    expect(results.slice(0, 3)).toEqual([0, 0, 0]);
    expect(results[3]).toBeGreaterThan(500);
    expect(results[4]).toBeGreaterThan(500);
    // Another address and another endpoint have their own counters.
    expect(await take(rule, "198.51.100.1")).toBe(0);
    expect(await take({ ...rule, name: "book" }, "203.0.113.7")).toBe(0);
  });

  it("starts over when the window has passed", async () => {
    for (let i = 0; i < 4; i++) await take(rule, "203.0.113.8");
    await testDb()`update rate_limits set window_start = now() - interval '11 minutes'`;
    expect(await take(rule, "203.0.113.8")).toBe(0);
  });

  it("never stores the IP address itself", async () => {
    await take(rule, "203.0.113.9");
    const rows = (await testDb()`select key from rate_limits`) as { key: string }[];
    expect(rows[0].key).toBe(callerKey(rule, "203.0.113.9"));
    expect(rows[0].key).not.toContain("203.0.113.9");
  });

  it("is cleared by the daily clean-up after a day", async () => {
    await take(rule, "203.0.113.10");
    await take(rule, "203.0.113.11");
    await testDb()`update rate_limits set window_start = now() - interval '2 days' where key = ${callerKey(rule, "203.0.113.10")}`;
    expect((await purgeExpiredData()).rateLimits).toBe(1);
    expect(((await testDb()`select 1 from rate_limits`) as unknown[]).length).toBe(1);
  });
});
