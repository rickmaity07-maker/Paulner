import { timingSafeEqual } from "node:crypto";
import { hasDatabase } from "@/lib/db";
import { purgeExpiredData } from "@/lib/retention";

/* Called daily by Vercel Cron (vercel.json), which sends "Authorization: Bearer $CRON_SECRET". */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const authorised =
    Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!authorised) return Response.json({ ok: false }, { status: 401 });
  if (!hasDatabase()) return Response.json({ ok: false, message: "No database." }, { status: 503 });

  return Response.json({ ok: true, deleted: await purgeExpiredData() });
}
