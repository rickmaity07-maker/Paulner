import { afterAll, beforeAll, beforeEach, vi } from "vitest";
import { resetDb, startDb } from "./pglite-db";

/* Every DB test talks to the in-memory Postgres instead of Neon. */
vi.mock("@/lib/db", async () => {
  const { testDb } = await import("./pglite-db");
  return { db: testDb, hasDatabase: () => true };
});

/* A cookie jar for code that reads the session cookie (lib/auth). Tests set cookies through it. */
export const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => void cookieJar.set(name, value),
    delete: (arg: string | { name: string }) => void cookieJar.delete(typeof arg === "string" ? arg : arg.name),
  }),
  headers: async () => new Headers({ host: "localhost:3000" }),
}));

/* after() needs a live request; in tests the deferred work (emails) is dropped. */
vi.mock("next/server", async (original) => ({ ...(await original<typeof import("next/server")>()), after: () => {} }));

/* No emails leave the tests. */
vi.mock("@/lib/mailer", () => ({
  notifyGuest: vi.fn(async () => {}),
  notifyNewReservation: vi.fn(async () => {}),
  notifyCancellation: vi.fn(async () => {}),
  sendTestEmail: vi.fn(async () => {}),
}));

beforeAll(async () => {
  await startDb();
});

beforeEach(async () => {
  cookieJar.clear();
  await resetDb();
});

afterAll(() => {
  vi.restoreAllMocks();
});
