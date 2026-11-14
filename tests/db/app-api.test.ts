import { beforeEach, describe, expect, it } from "vitest";
import { createAppToken } from "@/lib/app-auth";
import { hashPassword } from "@/lib/auth";
import { addUser, testDb } from "../support/pglite-db";

import * as login from "@/app/api/app/login/route";
import * as logout from "@/app/api/app/logout/route";
import * as tabs from "@/app/api/app/tabs/route";
import * as refund from "@/app/api/app/payments/[id]/refund/route";
import * as statsRoute from "@/app/api/app/stats/route";
import * as version from "@/app/api/app/version/route";
import * as bootstrap from "@/app/api/app/bootstrap/route";

/* The tablet API through its real route handlers: tokens, roles and input checks. */
const BASE = "http://localhost:3000";
const req = (path: string, { method = "GET", token, body }: { method?: string; token?: string; body?: unknown } = {}) =>
  new Request(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
const noCtx = { params: Promise.resolve({}) };

let ownerToken: string;
let staffToken: string;

beforeEach(async () => {
  const owner = await addUser("owner@test.local", "owner", { passwordHash: await hashPassword("Owner-Pass-1") });
  const staff = await addUser("staff@test.local", "staff", { passwordHash: await hashPassword("Staff-Pass-1") });
  await addUser("guest@test.local", "user", { passwordHash: await hashPassword("Guest-Pass-1") });
  ownerToken = await createAppToken(owner.id);
  staffToken = await createAppToken(staff.id);
});

describe("tokens", () => {
  it("wants a token on every endpoint except the version check", async () => {
    expect((await tabs.GET(req("/api/app/tabs"), noCtx)).status).toBe(401);
    expect((await tabs.GET(req("/api/app/tabs", { token: "r66app_forged" }), noCtx)).status).toBe(401);
    expect((await version.GET(req("/api/app/version?current=1"))).status).toBe(200);
    expect((await version.GET(req("/api/app/version?current=-1"))).status).toBe(422);
  });

  it("works for staff and owners and answers with no-store", async () => {
    const response = await bootstrap.GET(req("/api/app/bootstrap", { token: staffToken }), noCtx);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const data = await response.json();
    expect(data.user.role).toBe("staff");
    expect(data.categories.length).toBeGreaterThan(0);
  });

  it("locks out a deactivated or demoted account on its next request", async () => {
    await testDb()`update users set active = false where email = 'staff@test.local'`;
    expect((await tabs.GET(req("/api/app/tabs", { token: staffToken }), noCtx)).status).toBe(401);
    await testDb()`update users set role = 'user' where email = 'owner@test.local'`;
    expect((await tabs.GET(req("/api/app/tabs", { token: ownerToken }), noCtx)).status).toBe(401);
  });

  it("keeps owner-only endpoints from staff", async () => {
    const response = await refund.POST(req("/api/app/payments/x/refund", { method: "POST", token: staffToken }), {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    });
    expect(response.status).toBe(403);
  });

  it("revokes the token on sign-out", async () => {
    expect((await logout.POST(req("/api/app/logout", { method: "POST", token: staffToken }), noCtx)).status).toBe(200);
    expect((await tabs.GET(req("/api/app/tabs", { token: staffToken }), noCtx)).status).toBe(401);
  });
});

describe("tablet sign-in", () => {
  const signIn = (email: string, password: string) => login.POST(req("/api/app/login", { method: "POST", body: { email, password } }));

  it("issues a token for staff, refuses guests and wrong passwords", async () => {
    const ok = await signIn("STAFF@test.local ", "Staff-Pass-1");
    expect(ok.status).toBe(200);
    const { token } = await ok.json();
    expect(token).toMatch(/^r66app_/);
    expect((await signIn("guest@test.local", "Guest-Pass-1")).status).toBe(403);
    expect((await signIn("staff@test.local", "wrong")).status).toBe(401);
    expect((await signIn("nobody@test.local", "x")).status).toBe(401);
  });

  it("stores only a hash of the token", async () => {
    const { token } = await (await signIn("staff@test.local", "Staff-Pass-1")).json();
    const rows = (await testDb()`select token_hash from sessions where token_hash = ${token}`) as unknown[];
    expect(rows).toHaveLength(0);
  });

  it("locks an address after eight failures", async () => {
    for (let i = 0; i < 8; i++) await signIn("staff@test.local", "wrong");
    expect((await signIn("staff@test.local", "Staff-Pass-1")).status).toBe(429);
  });

  it("answers bad JSON with 400, not a crash", async () => {
    expect((await login.POST(req("/api/app/login", { method: "POST", body: "{nope" }))).status).toBe(400);
  });
});

describe("input checks", () => {
  it("validates the tabs filter and the stats range", async () => {
    expect((await tabs.GET(req("/api/app/tabs?status=everything", { token: staffToken }), noCtx)).status).toBe(422);
    expect((await tabs.GET(req("/api/app/tabs?status=closed&date=2026-1-1", { token: staffToken }), noCtx)).status).toBe(422);
    expect((await statsRoute.GET(req("/api/app/stats?from=2026-11-20&to=2026-11-01", { token: staffToken }), noCtx)).status).toBe(422);
    expect((await statsRoute.GET(req("/api/app/stats?from=2026-11-01&to=2026-11-20", { token: staffToken }), noCtx)).status).toBe(200);
  });

  it("turns a malformed id into 422 instead of a database error", async () => {
    const { GET } = await import("@/app/api/app/tabs/[id]/route");
    const response = await GET(req("/api/app/tabs/1;drop", { token: staffToken }), { params: Promise.resolve({ id: "1;drop table tabs" }) });
    expect(response.status).toBe(422);
  });
});
