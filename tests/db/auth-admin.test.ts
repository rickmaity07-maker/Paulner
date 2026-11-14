import { afterEach, describe, expect, it, vi } from "vitest";
import { createSession, hashPassword, SESSION_COOKIE } from "@/lib/auth";
import { GOOGLE_STATE_COOKIE } from "@/lib/google";
import { addBooking, getSite } from "@/lib/store";
import { addUser, testDb } from "../support/pglite-db";
import { cookieJar } from "../support/setup-db";

import { authenticate } from "@/app/login/actions";
import { cancelMyReservation, changePassword, deleteMyAccount } from "@/app/profile/actions";
import * as admin from "@/app/admin/actions";
import * as googleCallback from "@/app/api/auth/google/callback/route";

/* Sign-in, the profile and the owner's portal: who may do what, against real SQL. */

/* redirect() throws; this returns where it was sending the visitor, or null if it returned normally. */
async function redirectOf(run: () => Promise<unknown>) {
  try {
    await run();
    return null;
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    if (!digest.startsWith("NEXT_REDIRECT")) throw error;
    return digest.split(";")[2];
  }
}

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const signInAs = async (email: string, role: "user" | "staff" | "owner", password = "") => {
  const user = await addUser(email, role, { passwordHash: password ? await hashPassword(password) : "" });
  cookieJar.clear();
  await createSession(user.id);
  return user;
};

const sql = () => testDb();

describe("sign-in and sign-up", () => {
  const start = { error: null, email: "" };

  it("creates a guest account; the form can't pick a role", async () => {
    const to = await redirectOf(() => authenticate(start, form({ mode: "signup", email: "New@Test.local", password: "long-enough", name: "Neu", role: "owner" })));
    expect(to).toBe("/profile");
    const [user] = (await sql()`select email, role from users`) as { email: string; role: string }[];
    expect(user).toEqual({ email: "new@test.local", role: "user" });
    expect(cookieJar.has(SESSION_COOKIE)).toBe(true);
  });

  it("refuses short passwords, bad emails and taken addresses", async () => {
    await addUser("taken@test.local", "user");
    expect(await authenticate(start, form({ mode: "signup", email: "a@test.local", password: "short" }))).toMatchObject({ error: "password" });
    expect(await authenticate(start, form({ mode: "signup", email: "not-an-email", password: "long-enough" }))).toMatchObject({ error: "email" });
    expect(await authenticate(start, form({ mode: "signup", email: "taken@test.local", password: "long-enough" }))).toMatchObject({ error: "emailInUse" });
  });

  it("signs in owners to the portal and only follows local next links", async () => {
    await addUser("boss@test.local", "owner", { passwordHash: await hashPassword("Owner-Pass-1") });
    expect(await redirectOf(() => authenticate(start, form({ email: "boss@test.local", password: "Owner-Pass-1" })))).toBe("/admin");
    expect(await redirectOf(() => authenticate(start, form({ email: "boss@test.local", password: "Owner-Pass-1", next: "//evil.example" })))).toBe("/admin");
    expect(await redirectOf(() => authenticate(start, form({ email: "boss@test.local", password: "Owner-Pass-1", next: "/admin/menu" })))).toBe("/admin/menu");
  });

  it("gives the same answer for a wrong password, an unknown email and a deactivated account", async () => {
    await addUser("off@test.local", "user", { passwordHash: await hashPassword("Right-Pass-1"), active: false });
    await addUser("on@test.local", "user", { passwordHash: await hashPassword("Right-Pass-1") });
    for (const email of ["on@test.local", "nobody@test.local"]) {
      expect(await authenticate(start, form({ email, password: "wrong" }))).toMatchObject({ error: "credentials" });
    }
    expect(await authenticate(start, form({ email: "off@test.local", password: "Right-Pass-1" }))).toMatchObject({ error: "credentials" });
  });

  it("locks an email after eight failures, even with the right password", async () => {
    await addUser("lock@test.local", "user", { passwordHash: await hashPassword("Right-Pass-1") });
    for (let i = 0; i < 8; i++) await authenticate(start, form({ email: "lock@test.local", password: "wrong" }));
    expect(await authenticate(start, form({ email: "lock@test.local", password: "Right-Pass-1" }))).toMatchObject({ error: "tooMany" });
  });

  it("a Google-only account (no password) can't be signed into with an empty password", async () => {
    await addUser("google@test.local", "user", { passwordHash: "" });
    expect(await authenticate(start, form({ email: "google@test.local", password: "" }))).toMatchObject({ error: "credentials" });
  });
});

describe("profile", () => {
  const blank = { error: null, done: false };

  it("needs the current password to change it, and signs other devices out", async () => {
    const me = await signInAs("pw@test.local", "user", "Old-Pass-123");
    await sql()`insert into sessions (token_hash, user_id, expires_at) values ('other-device', ${me.id}, now() + interval '1 day')`;
    expect(await changePassword(blank, form({ current: "wrong", password: "New-Pass-123" }))).toMatchObject({ error: "wrongPassword" });
    expect(await changePassword(blank, form({ current: "Old-Pass-123", password: "New-Pass-123" }))).toMatchObject({ done: true });
    const tokens = (await sql()`select token_hash from sessions where user_id = ${me.id}`) as { token_hash: string }[];
    expect(tokens.map((t) => t.token_hash)).not.toContain("other-device");
    expect(tokens).toHaveLength(1);
  });

  it("cancels only the guest's own bookings", async () => {
    const other = await addUser("other@test.local", "user");
    const date = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    const theirs = await addBooking({ userId: other.id, date, time: "19:00", guests: 2, name: "Other", email: other.email, phone: "", note: "", locale: "de", status: "pending", table: "", staffNote: "", source: "website" });
    await signInAs("me@test.local", "user");
    await cancelMyReservation(form({ id: theirs.id }));
    const [row] = (await sql()`select status from reservations where id = ${theirs.id}`) as { status: string }[];
    expect(row.status).toBe("pending");
  });

  it("deletes an account only with the typed email, and never the last owner", async () => {
    await signInAs("bye@test.local", "user");
    expect(await deleteMyAccount(null, form({ confirm: "someone@else" }))).toBe("confirm");
    expect(await redirectOf(() => deleteMyAccount(null, form({ confirm: "BYE@test.local" })))).toBe("/?konto=geloescht");
    expect(((await sql()`select 1 from users where email = 'bye@test.local'`) as unknown[]).length).toBe(0);

    await signInAs("only-owner@test.local", "owner");
    expect(await deleteMyAccount(null, form({ confirm: "only-owner@test.local" }))).toBe("lastOwner");
  });

  it("sends strangers to the login", async () => {
    expect(await redirectOf(() => changePassword(blank, form({ current: "", password: "whatever-123" })))).toMatch(/^\/login/);
  });
});

describe("owner portal actions", () => {
  it("refuses guests and staff on every action, and changes nothing", async () => {
    const target = await addUser("target@test.local", "user");
    for (const role of ["user", "staff"] as const) {
      await signInAs(`${role}-x@test.local`, role);
      const attempts: (() => Promise<unknown>)[] = [
        () => admin.setUserRole(target.id, "owner"),
        () => admin.setUserActive(target.id, false),
        () => admin.resetPassword(target.id, "Hacked-Pass-1"),
        () => admin.createUser({ email: "evil@test.local", name: "", password: "Hacked-Pass-1", role: "owner" }),
        () => admin.saveMenu([]),
        () => admin.restoreBackup("{}"),
        () => admin.resetContent("ZURÜCKSETZEN"),
        () => admin.removeBooking("x"),
      ];
      for (const attempt of attempts) expect(await redirectOf(attempt)).toBe("/login");
    }
    const [user] = (await sql()`select role, active from users where id = ${target.id}`) as { role: string; active: boolean }[];
    expect(user).toEqual({ role: "user", active: true });
    expect(((await sql()`select 1 from users where email = 'evil@test.local'`) as unknown[]).length).toBe(0);
  });

  it("keeps at least one owner and stops owners demoting themselves", async () => {
    const me = await signInAs("owner@test.local", "owner");
    expect(await admin.setUserRole(me.id, "user")).toMatchObject({ ok: false });
    expect(await admin.setUserActive(me.id, false)).toMatchObject({ ok: false });
    const second = await addUser("second@test.local", "owner");
    expect(await admin.setUserRole(second.id, "staff")).toMatchObject({ ok: true });
  });

  it("signs a deactivated or demoted account out everywhere", async () => {
    await signInAs("owner@test.local", "owner");
    const staff = await addUser("bar@test.local", "staff");
    await sql()`insert into sessions (token_hash, user_id, expires_at) values ('tablet', ${staff.id}, now() + interval '30 days')`;
    expect(await admin.setUserActive(staff.id, false)).toMatchObject({ ok: true });
    expect(((await sql()`select 1 from sessions where user_id = ${staff.id}`) as unknown[]).length).toBe(0);
  });

  it("validates content before saving and rejects a broken backup", async () => {
    await signInAs("owner@test.local", "owner");
    const before = await getSite();
    expect(await admin.saveMenu([{ label: "Bier", drinks: [{ name: "X", price: "abc" }] }])).toMatchObject({ ok: false });
    expect(await admin.restoreBackup("not json")).toMatchObject({ ok: false });
    expect(await admin.saveVenue({ ...before.venue, maps: "javascript:alert(1)" })).toMatchObject({ ok: false });
    expect(await admin.resetContent("ja")).toMatchObject({ ok: false });
    expect((await getSite()).menu).toEqual(before.menu);
  });
});

describe("Google sign-in", () => {
  afterEach(() => vi.unstubAllGlobals());

  /* Google's token and userinfo answers, without the network. */
  const fakeGoogle = (profile: Record<string, unknown>) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("/token") ? Response.json({ access_token: "at" }) : Response.json(profile),
      ),
    );

  const callback = (state = "s1") => {
    cookieJar.set(GOOGLE_STATE_COOKIE, JSON.stringify({ state: "s1", verifier: "v", next: "" }));
    return googleCallback.GET(new Request(`http://localhost:3000/api/auth/google/callback?code=c&state=${state}`));
  };
  const location = (response: Response) => {
    const url = new URL(response.headers.get("location")!);
    return url.pathname + url.search;
  };

  it("refuses a forged state", async () => {
    fakeGoogle({ sub: "g1", email: "a@test.local", email_verified: true });
    expect(location(await callback("forged"))).toBe("/login?error=google");
  });

  it("refuses an address Google hasn't verified, so nobody can take over an account by email", async () => {
    await addUser("victim@test.local", "owner");
    fakeGoogle({ sub: "attacker", email: "victim@test.local", email_verified: false });
    expect(location(await callback())).toBe("/login?error=google");
    const [row] = (await sql()`select google_sub from users where email = 'victim@test.local'`) as { google_sub: string | null }[];
    expect(row.google_sub).toBeNull();
  });

  it("creates a guest account for a new verified address", async () => {
    fakeGoogle({ sub: "g2", email: "Fresh@Test.local", email_verified: true, name: "Fresh" });
    expect(location(await callback())).toBe("/profile");
    const [row] = (await sql()`select email, role, google_sub from users`) as { email: string; role: string; google_sub: string }[];
    expect(row).toEqual({ email: "fresh@test.local", role: "user", google_sub: "g2" });
  });

  it("keeps deactivated accounts out", async () => {
    await addUser("blocked@test.local", "user", { active: false });
    fakeGoogle({ sub: "g3", email: "blocked@test.local", email_verified: true });
    expect(location(await callback())).toBe("/login?error=google");
  });
});
