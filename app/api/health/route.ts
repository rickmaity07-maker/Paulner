import { db, hasDatabase } from "@/lib/db";

/* For uptime monitors: is the site up, and does the database answer? Says nothing else. */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!hasDatabase()) return Response.json({ ok: false, database: "not configured" }, { status: 503, headers });
  try {
    await db()`select 1`;
    return Response.json({ ok: true, database: "ok" }, { headers });
  } catch {
    return Response.json({ ok: false, database: "unreachable" }, { status: 503, headers });
  }
}
