import "server-only";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import { DEFAULT_SITE } from "@/lib/data";
import { db, hasDatabase } from "@/lib/db";
import type { ActivityEntry, Booking, BookingStatus, SiteContent } from "@/lib/types";

/*
  Everything the site and the portal read and write, on Neon Postgres.
  The page content is one JSON document (site_content), bookings are rows
  (reservations). Without DATABASE_URL the public site still renders from the
  built-in defaults; bookings and the portal need the database.
*/

/* Missing keys (from an older document) are filled from the defaults, so a new setting never breaks the page. */
function withDefaults(stored: Partial<SiteContent>): SiteContent {
  return {
    ...DEFAULT_SITE,
    ...stored,
    venue: { ...DEFAULT_SITE.venue, ...stored.venue },
    hero: { ...DEFAULT_SITE.hero, ...stored.hero },
    announcement: { ...DEFAULT_SITE.announcement, ...stored.announcement },
    booking: { ...DEFAULT_SITE.booking, ...stored.booking },
  };
}

export const getSite = cache(async (): Promise<SiteContent> => {
  if (!hasDatabase()) return structuredClone(DEFAULT_SITE);
  const sql = db();
  const rows = (await sql`select data, updated_at from site_content where id = 1`) as { data: Partial<SiteContent>; updated_at: string }[];
  if (rows[0]) return { ...withDefaults(rows[0].data), updatedAt: new Date(rows[0].updated_at).toISOString() };
  // First visit after setup: copy the built-in menu and texts in.
  await sql`insert into site_content (id, data) values (1, ${JSON.stringify(DEFAULT_SITE)}::jsonb) on conflict (id) do nothing`;
  return structuredClone(DEFAULT_SITE);
});

export async function updateSite(change: (site: SiteContent) => SiteContent | void, userId: string | null) {
  const site = structuredClone(await getSite());
  const next = change(site) ?? site;
  const data: Partial<SiteContent> = { ...next };
  delete data.updatedAt;
  await db()`
    insert into site_content (id, data, updated_at, updated_by)
    values (1, ${JSON.stringify(data)}::jsonb, now(), ${userId})
    on conflict (id) do update set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by
  `;
  return next;
}

/* ---------- Bookings ---------- */

interface ReservationRow {
  id: string;
  reference: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  note: string;
  locale: string;
  status: BookingStatus;
  table_label: string;
  staff_note: string;
  source: Booking["source"];
  created_at: string;
  updated_at: string | null;
}

const toBooking = (r: ReservationRow): Booking => ({
  id: r.id,
  reference: r.reference,
  userId: r.user_id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  date: r.date,
  time: r.time,
  guests: r.guests,
  note: r.note,
  locale: r.locale === "en" ? "en" : "de",
  status: r.status,
  table: r.table_label,
  staffNote: r.staff_note,
  source: r.source,
  createdAt: new Date(r.created_at).toISOString(),
  updatedAt: new Date(r.updated_at ?? r.created_at).toISOString(),
});

const COLUMNS = `id, reference, user_id, name, email, phone, date::text as date, to_char(time, 'HH24:MI') as time,
  guests, note, locale, status, table_label, staff_note, source, created_at, updated_at`;

export async function getBookings(): Promise<Booking[]> {
  if (!hasDatabase()) return [];
  const rows = (await db().query(`select ${COLUMNS} from reservations order by date, time, created_at`)) as ReservationRow[];
  return rows.map(toBooking);
}

export async function getBooking(id: string): Promise<Booking | null> {
  const rows = (await db().query(`select ${COLUMNS} from reservations where id = $1`, [id])) as ReservationRow[];
  return rows[0] ? toBooking(rows[0]) : null;
}

/* Short, readable, and checked against the unique index; a clash just draws again. */
const newReference = () =>
  `R66-${Array.from(randomBytes(5), (byte) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[byte % 32]).join("")}`;

export async function addBooking(input: Omit<Booking, "id" | "reference" | "createdAt" | "updatedAt">): Promise<Booking> {
  const sql = db();
  for (let attempt = 0; attempt < 5; attempt++) {
    const rows = (await sql.query(
      `insert into reservations (reference, user_id, name, email, phone, date, time, guests, note, locale, status, table_label, staff_note, source)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       on conflict (reference) do nothing
       returning ${COLUMNS}`,
      [
        newReference(),
        input.userId,
        input.name,
        input.email,
        input.phone,
        input.date,
        input.time,
        input.guests,
        input.note,
        input.locale,
        input.status,
        input.table,
        input.staffNote,
        input.source,
      ],
    )) as ReservationRow[];
    if (rows[0]) return toBooking(rows[0]);
  }
  throw new Error("Could not draw a free booking reference.");
}

export async function updateBooking(
  id: string,
  patch: Partial<Pick<Booking, "status" | "table" | "staffNote" | "guests" | "time" | "date">>,
  userId: string | null,
): Promise<Booking | null> {
  const current = await getBooking(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  const rows = (await db().query(
    `update reservations
       set status = $2, table_label = $3, staff_note = $4, guests = $5, time = $6, date = $7, updated_at = now(), updated_by = $8
     where id = $1
     returning ${COLUMNS}`,
    [id, next.status, next.table, next.staffNote, next.guests, next.time, next.date, userId],
  )) as ReservationRow[];
  return rows[0] ? toBooking(rows[0]) : null;
}

export async function confirmAllPending(userId: string | null) {
  const rows = (await db().query(
    `update reservations set status = 'confirmed', updated_at = now(), updated_by = $1
     where status = 'pending' returning ${COLUMNS}`,
    [userId],
  )) as ReservationRow[];
  return rows.map(toBooking);
}

export async function deleteBooking(id: string): Promise<Booking | null> {
  const rows = (await db().query(`delete from reservations where id = $1 returning ${COLUMNS}`, [id])) as ReservationRow[];
  return rows[0] ? toBooking(rows[0]) : null;
}

/* ---------- Activity ---------- */

export async function getActivity(limit = 300): Promise<ActivityEntry[]> {
  if (!hasDatabase()) return [];
  const rows = (await db()`
    select id::text, at, action, detail, user_email from activity_log order by at desc limit ${limit}
  `) as { id: string; at: string; action: string; detail: string; user_email: string }[];
  return rows.map((r) => ({ id: r.id, at: new Date(r.at).toISOString(), action: r.action, detail: r.detail, userEmail: r.user_email }));
}
