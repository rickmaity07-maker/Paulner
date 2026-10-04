"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { logActivity } from "@/lib/activity";
import { destroySession, hashPassword, requireUser, revokeOtherSessions, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyCancellation } from "@/lib/mailer";
import { getBooking } from "@/lib/store";

export type ProfileError = "name" | "phone" | "wrongPassword" | "password";
export interface ProfileState {
  error: ProfileError | null;
  done: boolean;
}

export async function updateProfile(_previous: ProfileState, form: FormData): Promise<ProfileState> {
  const me = await requireUser();
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 40);
  if (name.length < 2) return { error: "name", done: false };
  if (phone && phone.replace(/\D/g, "").length < 6) return { error: "phone", done: false };

  await db()`update users set name = ${name}, phone = ${phone} where id = ${me.id}`;
  await logActivity(me, "Profil geändert", "user", me.id, `${name}, ${phone}`);
  revalidatePath("/profile");
  return { error: null, done: true };
}

export async function changePassword(_previous: ProfileState, form: FormData): Promise<ProfileState> {
  const me = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  const sql = db();
  const [row] = (await sql`select password_hash from users where id = ${me.id}`) as { password_hash: string }[];
  if (!row) return { error: "wrongPassword", done: false };
  // Accounts created through Google have no password yet; they may set one directly.
  if (row.password_hash && !(await verifyPassword(current, row.password_hash))) {
    return { error: "wrongPassword", done: false };
  }
  if (next.length < 8) return { error: "password", done: false };

  await sql`update users set password_hash = ${await hashPassword(next)} where id = ${me.id}`;
  await revokeOtherSessions(me.id);
  await logActivity(me, "Passwort geändert", "user", me.id, `${me.email} (selbst)`);
  return { error: null, done: true };
}

/* A guest can cancel their own request or confirmed booking, as long as the day has not passed. */
export async function cancelMyReservation(form: FormData) {
  const me = await requireUser();
  const id = String(form.get("id") ?? "");
  const rows = (await db()`
    update reservations set status = 'cancelled', updated_at = now(), updated_by = ${me.id}
    where id = ${id} and user_id = ${me.id} and status in ('pending', 'confirmed')
      and date >= (now() at time zone 'Europe/Berlin')::date
    returning id
  `) as { id: string }[];
  if (!rows[0]) return;
  const booking = await getBooking(rows[0].id);
  if (!booking) return;

  await logActivity(me, "Vom Gast storniert", "reservation", id, `${booking.reference} · ${booking.name}, ${booking.date}`);
  after(() => notifyCancellation(booking, me.email));
  revalidatePath("/profile");
  revalidatePath("/admin", "layout");
}

export type DeleteError = "lastOwner" | "confirm";

/*
  Right to erasure (Art. 17 DSGVO): removes the account, its sessions and its
  bookings, and replaces the address in the activity log. The bar is told about
  upcoming bookings that disappear with it, so no table is kept for nobody.
*/
export async function deleteMyAccount(_previous: DeleteError | null, form: FormData): Promise<DeleteError | null> {
  const me = await requireUser();
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== me.email.toLowerCase()) return "confirm";
  const sql = db();
  if (me.role === "owner") {
    const [{ count }] = (await sql`select count(*)::int as count from users where role = 'owner' and active`) as { count: number }[];
    if (count <= 1) return "lastOwner";
  }

  const upcoming = (await sql`
    select id from reservations
    where user_id = ${me.id} and status in ('pending', 'confirmed')
      and date >= (now() at time zone 'Europe/Berlin')::date
  `) as { id: string }[];
  const bookings = (await Promise.all(upcoming.map((row) => getBooking(row.id)))).filter((b) => b !== null);

  await sql.transaction([
    sql`delete from reservations where user_id = ${me.id}`,
    sql`update activity_log set user_email = 'gelöschtes Konto', detail = '' where user_id = ${me.id}`,
    sql`delete from login_attempts where email = ${me.email}`,
    sql`delete from users where id = ${me.id}`,
  ]);
  await logActivity(null, "Konto gelöscht", "user", "", `${bookings.length} offene Reservierungen entfernt`);
  for (const booking of bookings) after(() => notifyCancellation(booking, "gelöschtes Konto"));

  await destroySession();
  revalidatePath("/admin", "layout");
  redirect("/?konto=geloescht");
}
