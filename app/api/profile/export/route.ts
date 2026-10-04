import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

/* Right of access and to data portability (Art. 15, 20 DSGVO): everything stored about the signed-in account. */
export async function GET() {
  const me = await getSession();
  if (!me) return Response.json({ error: "Not signed in." }, { status: 401 });

  const sql = db();
  const [[account], reservations, activity] = await Promise.all([
    sql`select email, name, phone, role, created_at, last_login_at, google_sub is not null as google_linked,
          password_hash <> '' as has_password
        from users where id = ${me.id}`,
    sql`select created_at, name, phone, email, date::text as date, to_char(time, 'HH24:MI') as time,
          guests, note, locale, status, reference
        from reservations where user_id = ${me.id} order by date, time`,
    sql`select at, action, entity, detail from activity_log where user_id = ${me.id} order by at`,
  ]);

  const body = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      controller: "Paulaner Meets Route 66, Am Zeughaus 8, 97421 Schweinfurt",
      account,
      reservations,
      activity,
      sessions_and_cookies: "A session cookie keeps you signed in for up to five days; only a hash of it is stored.",
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="paulaner-route66-meine-daten.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
