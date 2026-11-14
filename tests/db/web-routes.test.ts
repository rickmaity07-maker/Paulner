import { beforeEach, describe, expect, it } from "vitest";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { berlinNow } from "@/lib/hours";
import { purgeExpiredData } from "@/lib/retention";
import { addBooking, updateSite } from "@/lib/store";
import { addUser, testDb } from "../support/pglite-db";
import { cookieJar } from "../support/setup-db";

import * as book from "@/app/api/book/route";
import * as cron from "@/app/api/cron/cleanup/route";
import * as health from "@/app/api/health/route";
import * as me from "@/app/api/me/route";
import * as profileExport from "@/app/api/profile/export/route";
import * as adminExport from "@/app/admin/export/route";

/* Website routes with a real session cookie and real SQL. */
const signInAs = async (email: string, role: "user" | "staff" | "owner") => {
  const user = await addUser(email, role);
  cookieJar.clear();
  await createSession(user.id);
  return user;
};

/* The next date the default hours are open, at least two days out, and its first slot. */
async function bookableDay() {
  const { getSite } = await import("@/lib/store");
  const { slotsFor } = await import("@/lib/booking");
  const site = await getSite();
  for (let i = 2; i < 14; i++) {
    const date = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
    const slots = slotsFor(date, site);
    if (slots.length) return { date, time: slots[0] };
  }
  throw new Error("no open day in the next two weeks");
}

const post = (body: unknown) => new Request("http://localhost:3000/api/book", { method: "POST", body: JSON.stringify(body) });

beforeEach(async () => {
  delete process.env.CRON_SECRET;
});

describe("booking requests", () => {
  it("needs an account", async () => {
    expect((await book.POST(post({}))).status).toBe(401);
  });

  it("books with the account's email, whatever the form sends", async () => {
    await signInAs("anna@test.local", "user");
    const slot = await bookableDay();
    const response = await book.POST(post({ ...slot, guests: 2, name: "Anna", email: "someone-else@test.local" }));
    expect(response.status).toBe(201);
    const [row] = (await testDb()`select email, status, source from reservations`) as { email: string; status: string; source: string }[];
    expect(row).toEqual({ email: "anna@test.local", status: "pending", source: "website" });
  });

  it("rejects closed days, past dates and times that already went by today", async () => {
    await signInAs("ben@test.local", "user");
    const slot = await bookableDay();
    const errors = async (body: object) => (await (await book.POST(post({ guests: 2, name: "Ben", ...body }))).json()).errors;
    expect((await errors({ ...slot, date: "2020-01-01" })).date).toBe("past");
    expect((await errors({ ...slot, time: "03:17" })).time).toBe("slot");

    // Today, with every hour open and a slot at 00:00, that slot has passed (unless it is exactly midnight).
    const today = berlinNow().date;
    await updateSite((site) => ({
      ...site,
      hours: site.hours.map((d) => ({ ...d, open: "00:00", close: null })),
      booking: { ...site.booking, lastSeating: "23:30" },
    }), null);
    if (berlinNow().minutes > 0) expect((await errors({ date: today, time: "00:00" })).time).toBe("slot");
  });

  it("caps open requests per account and respects a paused booking switch", async () => {
    const user = await signInAs("carl@test.local", "user");
    const slot = await bookableDay();
    for (let i = 0; i < 3; i++) {
      await addBooking({ userId: user.id, ...slot, guests: 2, name: "Carl", email: user.email, phone: "", note: "", locale: "de", status: "pending", table: "", staffNote: "", source: "website" });
    }
    expect((await book.POST(post({ ...slot, guests: 2, name: "Carl" }))).status).toBe(429);

    await signInAs("dora@test.local", "user");
    await updateSite((site) => ({ ...site, booking: { ...site.booking, enabled: false } }), null);
    expect((await book.POST(post({ ...slot, guests: 2, name: "Dora" }))).status).toBe(403);
  });

  it("answers bad JSON with 400", async () => {
    await signInAs("eva@test.local", "user");
    const response = await book.POST(new Request("http://localhost:3000/api/book", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
  });
});

describe("sessions", () => {
  it("knows the signed-in account and nothing about strangers", async () => {
    expect(await (await me.GET()).json()).toEqual({ user: null });
    await signInAs("fritz@test.local", "user");
    const { user } = await (await me.GET()).json();
    expect(user).toMatchObject({ email: "fritz@test.local", role: "user" });
    expect(user.password_hash).toBeUndefined();
  });

  it("ends a session when the account is deactivated", async () => {
    const user = await signInAs("gina@test.local", "user");
    await testDb()`update users set active = false where id = ${user.id}`;
    expect(await (await me.GET()).json()).toEqual({ user: null });
  });

  it("stores only a hash of the session cookie", async () => {
    await signInAs("hans@test.local", "user");
    const token = cookieJar.get(SESSION_COOKIE)!;
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(((await testDb()`select 1 from sessions where token_hash = ${token}`) as unknown[]).length).toBe(0);
  });
});

describe("exports", () => {
  it("gives a guest only their own data", async () => {
    const other = await addUser("other@test.local", "user");
    const slot = await bookableDay();
    await addBooking({ userId: other.id, ...slot, guests: 2, name: "Other", email: other.email, phone: "", note: "", locale: "de", status: "pending", table: "", staffNote: "", source: "website" });
    expect((await profileExport.GET()).status).toBe(401);

    await signInAs("ida@test.local", "user");
    const data = JSON.parse(await (await profileExport.GET()).text());
    expect(data.account.email).toBe("ida@test.local");
    expect(data.account.password_hash).toBeUndefined();
    expect(data.reservations).toEqual([]);
  });

  it("keeps the bookings spreadsheet to owners and defuses formulas", async () => {
    const request = new Request("http://localhost:3000/admin/export?type=bookings");
    await signInAs("staff@test.local", "staff");
    expect((await adminExport.GET(request)).status).toBe(401);

    await signInAs("owner@test.local", "owner");
    const slot = await bookableDay();
    await addBooking({ userId: null, ...slot, guests: 2, name: '=HYPERLINK("http://evil.example","klick")', email: "", phone: "+49 1", note: "", locale: "de", status: "confirmed", table: "", staffNote: "", source: "phone" });
    const csv = await (await adminExport.GET(request)).text();
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.example"",""klick"")"`);
    expect(csv).toContain(`"'+49 1"`);
  });
});

describe("housekeeping", () => {
  it("runs the clean-up only with the cron secret", async () => {
    const call = (auth?: string) => cron.GET(new Request("http://localhost:3000/api/cron/cleanup", { headers: auth ? { authorization: auth } : {} }));
    expect((await call("Bearer anything")).status).toBe(401);
    process.env.CRON_SECRET = "s3cret-value";
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong-value")).status).toBe(401);
    const ok = await call("Bearer s3cret-value");
    expect(ok.status).toBe(200);
    expect((await ok.json()).ok).toBe(true);
  });

  it("deletes data past its retention period and keeps the rest", async () => {
    const sql = testDb();
    await sql`insert into reservations (reference, name, date, time, guests) values ('R66-OLD', 'Alt', current_date - interval '7 months', '19:00', 2), ('R66-NEW', 'Neu', current_date, '19:00', 2)`;
    await sql`insert into login_attempts (email, attempted_at) values ('x@test.local', now() - interval '2 days'), ('y@test.local', now())`;
    const deleted = await purgeExpiredData();
    expect(deleted).toMatchObject({ reservations: 1, loginAttempts: 1 });
    const left = (await sql`select reference from reservations`) as { reference: string }[];
    expect(left.map((r) => r.reference)).toEqual(["R66-NEW"]);
  });

  it("reports health", async () => {
    const response = await health.GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, database: "ok" });
  });
});
