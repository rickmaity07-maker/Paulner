"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { logActivity } from "@/lib/activity";
import { hashPassword, requireOwner, type SessionUser } from "@/lib/auth";
import { DEFAULT_SITE } from "@/lib/data";
import { db } from "@/lib/db";
import { notifyGuest, sendTestEmail as sendTest } from "@/lib/mailer";
import { addBooking, confirmAllPending as confirmAll, deleteBooking, getBooking, getSite, updateBooking, updateSite } from "@/lib/store";
import { berlinNow } from "@/lib/hours";
import type { BookingStatus, SiteContent } from "@/lib/types";
import {
  InputError,
  cleanAnnouncement,
  cleanBookingSettings,
  cleanClosures,
  cleanHero,
  cleanHours,
  cleanInfo,
  cleanMarquee,
  cleanMenu,
  cleanSite,
  cleanTaps,
  cleanVenue,
  date,
  int,
  status as cleanStatus,
  str,
  time,
} from "@/lib/validate";

/*
  Every action re-checks the session itself: server actions can be called with a
  crafted request, so the layout's check alone is not enough. Messages are German.
*/
export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const STATUS_DE: Record<BookingStatus, string> = {
  pending: "offen",
  confirmed: "bestätigt",
  seated: "am Tisch",
  cancelled: "storniert",
  "no-show": "nicht erschienen",
};

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function run(task: (me: SessionUser) => Promise<string | void>): Promise<ActionResult> {
  const me = await requireOwner();
  try {
    const message = await task(me);
    revalidatePath("/");
    revalidatePath("/admin", "layout");
    return { ok: true, message: message ?? "Gespeichert." };
  } catch (error) {
    if (error instanceof InputError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Das hat nicht geklappt. Bitte noch einmal versuchen." };
  }
}

/* ---------- Reservierungen ---------- */

export async function setBookingStatus(id: string, next: BookingStatus) {
  return run(async (me) => {
    const booking = await updateBooking(str(id, 60, "Reservierung"), { status: cleanStatus(next) }, me.id);
    if (!booking) throw new InputError("Diese Reservierung gibt es nicht mehr.");
    await logActivity(me, `Reservierung ${STATUS_DE[next]}`, "reservation", booking.id, `${booking.reference} · ${booking.name}`);
    if (next === "confirmed" || next === "cancelled") {
      const base = await origin();
      after(() => notifyGuest(next, booking, base));
    }
    return `${booking.name}: ${STATUS_DE[next]}.`;
  });
}

export async function confirmAllPending() {
  return run(async (me) => {
    const confirmed = await confirmAll(me.id);
    await logActivity(me, "Alle offenen bestätigt", "reservation", "", `${confirmed.length} Reservierungen`);
    const base = await origin();
    after(async () => {
      for (const booking of confirmed) await notifyGuest("confirmed", booking, base);
    });
    return confirmed.length ? `${confirmed.length} ${confirmed.length === 1 ? "Reservierung" : "Reservierungen"} bestätigt.` : "Es war nichts offen.";
  });
}

export async function saveBookingDetails(id: string, input: { table?: string; staffNote?: string; guests?: number; time?: string; date?: string }) {
  return run(async (me) => {
    const before = await getBooking(str(id, 60, "Reservierung"));
    const booking = await updateBooking(
      str(id, 60, "Reservierung"),
      {
        table: str(input.table, 20, "Tisch"),
        staffNote: str(input.staffNote, 400, "Interne Notiz"),
        ...(input.guests !== undefined ? { guests: int(input.guests, 1, 60, "Gäste") } : {}),
        ...(input.time ? { time: time(input.time, "Uhrzeit") } : {}),
        ...(input.date ? { date: date(input.date, "Datum") } : {}),
      },
      me.id,
    );
    if (!booking) throw new InputError("Diese Reservierung gibt es nicht mehr.");
    const moved =
      before && (before.date !== booking.date || before.time !== booking.time || before.guests !== booking.guests);
    await logActivity(
      me,
      moved ? "Reservierung verschoben" : "Reservierung bearbeitet",
      "reservation",
      booking.id,
      moved && before
        ? `${booking.reference} · ${booking.name}: ${before.date} ${before.time} (${before.guests}) → ${booking.date} ${booking.time} (${booking.guests})`
        : `${booking.reference} · ${booking.name}`,
    );
    // Only the guest-facing details trigger an email; a table number or internal note doesn't.
    if (moved && before && booking.email && (booking.status === "pending" || booking.status === "confirmed")) {
      const base = await origin();
      after(() => notifyGuest("changed", booking, base, { date: before.date, time: before.time, guests: before.guests }));
      return "Gespeichert. Der Gast bekommt eine E-Mail mit den neuen Angaben.";
    }
    return "Reservierung gespeichert.";
  });
}

export async function createStaffBooking(input: Record<string, unknown>) {
  return run(async (me) => {
    const email = str(input.email, 120, "E-Mail");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InputError("Die E-Mail-Adresse sieht nicht richtig aus.");
    const source = input.source === "walk-in" ? "walk-in" : "phone";
    const booking = await addBooking({
      userId: null,
      date: date(input.date, "Datum"),
      time: time(input.time, "Uhrzeit"),
      guests: int(input.guests, 1, 60, "Gäste"),
      name: str(input.name, 80, "Name", { required: true }),
      email,
      phone: str(input.phone, 30, "Telefon"),
      note: str(input.note, 280, "Notiz"),
      locale: input.locale === "en" ? "en" : "de",
      status: input.status === "seated" ? "seated" : "confirmed",
      table: str(input.table, 20, "Tisch"),
      staffNote: "",
      source,
    });
    await logActivity(
      me,
      source === "walk-in" ? "Laufkundschaft eingetragen" : "Telefonische Reservierung",
      "reservation",
      booking.id,
      `${booking.reference} · ${booking.name} · ${booking.guests} am ${booking.date} ${booking.time}`,
    );
    if (booking.email && booking.status === "confirmed") {
      const base = await origin();
      after(() => notifyGuest("confirmed", booking, base));
      return `${booking.name} eingetragen (${booking.reference}). Bestätigung per E-Mail ist unterwegs.`;
    }
    return `${booking.name} eingetragen (${booking.reference}).`;
  });
}

export async function removeBooking(id: string) {
  return run(async (me) => {
    const booking = await deleteBooking(str(id, 60, "Reservierung"));
    if (!booking) throw new InputError("Diese Reservierung gibt es nicht mehr.");
    await logActivity(me, "Reservierung gelöscht", "reservation", booking.id, `${booking.reference} · ${booking.name}`);
    // Deleting a table the guest still expects counts as a cancellation for them.
    if (booking.email && (booking.status === "pending" || booking.status === "confirmed") && booking.date >= berlinNow().date) {
      const base = await origin();
      after(() => notifyGuest("cancelled", booking, base));
      return "Reservierung gelöscht. Der Gast wurde per E-Mail informiert.";
    }
    return "Reservierung gelöscht.";
  });
}

export async function sendTestEmail() {
  return run(async (me) => {
    try {
      await sendTest(await origin());
    } catch (error) {
      if (error instanceof Error && error.message === "not-configured")
        throw new InputError("Die E-Mail-Zugangsdaten fehlen noch (GMAIL_USER, GMAIL_APP_PASSWORD, RESERVATION_NOTIFY_EMAIL).");
      console.error(error);
      throw new InputError("Gmail hat die Anmeldung abgelehnt. Bitte App-Passwort und Absender-Adresse prüfen.");
    }
    await logActivity(me, "Test-E-Mail gesendet", "mail", "", process.env.RESERVATION_NOTIFY_EMAIL ?? "");
    return `Test-E-Mail an ${process.env.RESERVATION_NOTIFY_EMAIL} gesendet.`;
  });
}

/* ---------- Inhalte ---------- */

async function saveSection(me: SessionUser, patch: (site: SiteContent) => SiteContent, action: string, detail = "") {
  await updateSite(patch, me.id);
  await logActivity(me, action, "content", "", detail);
}

export async function saveMenu(menu: unknown) {
  return run(async (me) => {
    const clean = cleanMenu(menu);
    const count = clean.reduce((n, c) => n + c.drinks.length, 0);
    await saveSection(me, (site) => ({ ...site, menu: clean }), "Karte geändert", `${clean.length} Kategorien, ${count} Getränke`);
    return "Karte gespeichert. Sie ist sofort online.";
  });
}

export async function setDrinkSoldOut(drinkId: string, soldOut: boolean) {
  return run(async (me) => {
    let name = "";
    await updateSite((site) => {
      for (const c of site.menu)
        for (const d of c.drinks)
          if (d.id === drinkId) {
            d.soldOut = soldOut;
            name = d.name;
          }
    }, me.id);
    if (!name) throw new InputError("Dieses Getränk steht nicht mehr auf der Karte.");
    await logActivity(me, soldOut ? "Ausverkauft markiert" : "Wieder verfügbar", "content", drinkId, name);
    return `${name}: ${soldOut ? "ausverkauft" : "wieder da"}.`;
  });
}

export async function saveTaps(taps: unknown) {
  return run(async (me) => {
    const clean = cleanTaps(taps);
    await saveSection(me, (site) => ({ ...site, taps: clean }), "Zapfhähne geändert", clean.map((t) => t.name).join(", "));
    return "Zapfhähne gespeichert.";
  });
}

export async function saveHours(input: { hours: unknown; closures: unknown; booking: unknown }) {
  return run(async (me) => {
    const hours = cleanHours(input.hours);
    const closures = cleanClosures(input.closures);
    const booking = cleanBookingSettings(input.booking);
    await saveSection(me, (site) => ({ ...site, hours, closures, booking }), "Öffnungszeiten geändert", `${closures.length} Schließtage`);
    return "Öffnungszeiten gespeichert.";
  });
}

export async function saveContent(input: { hero: unknown; announcement: unknown; info: unknown; marquee: unknown }) {
  return run(async (me) => {
    const hero = cleanHero(input.hero);
    const announcement = cleanAnnouncement(input.announcement);
    const info = cleanInfo(input.info);
    const marquee = cleanMarquee(input.marquee);
    await saveSection(me, (site) => ({ ...site, hero, announcement, info, marquee }), "Texte geändert");
    return "Texte gespeichert.";
  });
}

export async function setAnnouncementEnabled(enabled: boolean) {
  return run(async (me) => {
    const site = await getSite();
    if (enabled && !site.announcement.text.trim()) throw new InputError("Schreibt den Hinweis zuerst unter „Texte“.");
    await saveSection(me, (s) => ({ ...s, announcement: { ...s.announcement, enabled } }), enabled ? "Hinweis eingeblendet" : "Hinweis ausgeblendet", site.announcement.text);
    return enabled ? "Der Hinweis ist online." : "Hinweis ausgeblendet.";
  });
}

export async function setBookingsEnabled(enabled: boolean) {
  return run(async (me) => {
    await saveSection(me, (s) => ({ ...s, booking: { ...s.booking, enabled } }), enabled ? "Online-Reservierung geöffnet" : "Online-Reservierung pausiert");
    return enabled ? "Online-Reservierung ist offen." : "Online-Reservierung pausiert.";
  });
}

export async function saveVenue(venue: unknown) {
  return run(async (me) => {
    const clean = cleanVenue(venue);
    await saveSection(me, (site) => ({ ...site, venue: clean }), "Angaben zur Bar geändert");
    return "Angaben gespeichert.";
  });
}

export async function restoreBackup(json: string) {
  return run(async (me) => {
    let parsed: { site?: unknown };
    try {
      parsed = JSON.parse(str(json, 5_000_000, "Sicherung"));
    } catch {
      throw new InputError("Diese Datei ist keine gültige Sicherung.");
    }
    const site = cleanSite(parsed.site ?? parsed);
    await saveSection(me, () => site, "Sicherung eingespielt");
    return "Sicherung eingespielt. Reservierungen und Konten bleiben unverändert.";
  });
}

export async function resetContent(confirmation: string) {
  return run(async (me) => {
    if (confirmation !== "ZURÜCKSETZEN") throw new InputError("Zum Bestätigen ZURÜCKSETZEN eingeben.");
    await saveSection(me, () => structuredClone(DEFAULT_SITE), "Inhalte zurückgesetzt");
    return "Karte und Texte sind wieder im Ausgangszustand. Reservierungen bleiben erhalten.";
  });
}

/* ---------- Konten (wie Bar-05) ---------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function activeOwnerCount() {
  const [{ count }] = (await db()`select count(*)::int as count from users where role = 'owner' and active`) as { count: number }[];
  return count;
}

export async function createUser(input: { email: string; name: string; password: string; role: string }) {
  return run(async (me) => {
    const email = str(input.email, 160, "E-Mail", { required: true }).toLowerCase();
    if (!EMAIL.test(email)) throw new InputError("Bitte eine gültige E-Mail-Adresse angeben.");
    if (String(input.password ?? "").length < 8) throw new InputError("Passwörter brauchen mindestens 8 Zeichen.");
    const role = input.role === "owner" || input.role === "staff" ? input.role : "user";
    const rows = (await db()`
      insert into users (email, name, password_hash, role)
      values (${email}, ${str(input.name, 120, "Name")}, ${await hashPassword(input.password)}, ${role})
      on conflict (email) do nothing
      returning id
    `) as { id: string }[];
    if (!rows[0]) throw new InputError("Für diese E-Mail gibt es schon ein Konto.");
    await logActivity(me, "Konto angelegt", "user", rows[0].id, `${email} (${ROLE_DE[role]})`);
    return "Konto angelegt. Gebt das Passwort persönlich weiter.";
  });
}

const ROLE_DE = { owner: "Inhaber", staff: "Personal", user: "Gast" } as const;

export async function setUserRole(id: string, role: string) {
  return run(async (me) => {
    const next = role === "owner" || role === "staff" ? role : "user";
    if (id === me.id && next !== "owner") throw new InputError("Das eigene Konto kann sich nicht selbst herabstufen.");
    if (next !== "owner" && (await activeOwnerCount()) <= 1) {
      const target = (await db()`select role from users where id = ${id}`) as { role: string }[];
      if (target[0]?.role === "owner") throw new InputError("Es muss immer mindestens einen aktiven Inhaber geben.");
    }
    const rows = (await db()`update users set role = ${next} where id = ${id} returning email`) as { email: string }[];
    if (!rows[0]) throw new InputError("Dieses Konto gibt es nicht mehr.");
    await logActivity(me, "Rolle geändert", "user", id, `${rows[0].email} → ${ROLE_DE[next]}`);
    // Signing a demoted account out of the tablet app straight away.
    if (next === "user") await db()`delete from sessions where user_id = ${id}`;
    return `${rows[0].email} ist jetzt ${ROLE_DE[next]}.`;
  });
}

export async function setUserActive(id: string, active: boolean) {
  return run(async (me) => {
    if (id === me.id && !active) throw new InputError("Das eigene Konto kann sich nicht selbst deaktivieren.");
    const sql = db();
    if (!active) {
      const target = (await sql`select role from users where id = ${id}`) as { role: string }[];
      if (target[0]?.role === "owner" && (await activeOwnerCount()) <= 1) throw new InputError("Es muss immer mindestens einen aktiven Inhaber geben.");
    }
    const rows = (await sql`update users set active = ${active} where id = ${id} returning email`) as { email: string }[];
    if (!rows[0]) throw new InputError("Dieses Konto gibt es nicht mehr.");
    // A deactivated account is signed out everywhere at once.
    if (!active) await sql`delete from sessions where user_id = ${id}`;
    await logActivity(me, active ? "Konto aktiviert" : "Konto deaktiviert", "user", id, rows[0].email);
    return active ? "Konto aktiviert." : "Konto deaktiviert und überall abgemeldet.";
  });
}

export async function resetPassword(id: string, password: string) {
  return run(async (me) => {
    if (String(password ?? "").length < 8) throw new InputError("Passwörter brauchen mindestens 8 Zeichen.");
    const sql = db();
    const rows = (await sql`update users set password_hash = ${await hashPassword(password)} where id = ${id} returning email`) as { email: string }[];
    if (!rows[0]) throw new InputError("Dieses Konto gibt es nicht mehr.");
    // Other devices must sign in again with the new password; the owner's own session survives.
    if (id !== me.id) await sql`delete from sessions where user_id = ${id}`;
    await logActivity(me, "Passwort zurückgesetzt", "user", id, rows[0].email);
    return "Passwort geändert. Andere Geräte dieses Kontos wurden abgemeldet.";
  });
}
