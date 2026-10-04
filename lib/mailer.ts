import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getSite } from "@/lib/store";
import type { Booking, Venue } from "@/lib/types";

/*
  Every booking email, set up like the Bar-05 site: a Gmail account with
  2-Step Verification and an App Password (myaccount.google.com/apppasswords).
  SMTP_HOST switches to any other mail server with the same user and password.

  To the guest, in the language they booked in:
    received          the request arrived
    confirmed         the bar confirmed it            (+ calendar file)
    changed           date, time or party size moved  (+ updated calendar file)
    cancelled         the bar cancelled it            (+ calendar removal)
    cancelledByGuest  receipt for cancelling from the profile (+ calendar removal)
  To the bar (RESERVATION_NOTIFY_EMAIL):
    new request, cancelled by a guest

  Nothing is sent until GMAIL_USER, GMAIL_APP_PASSWORD and RESERVATION_NOTIFY_EMAIL
  are set, and no email failure ever loses or blocks a booking.
*/
let transporter: Transporter | null = null;

export const isMailerConfigured = () =>
  Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.RESERVATION_NOTIFY_EMAIL);

function mailer(): Transporter {
  const auth = { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD };
  transporter ??= process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_PORT === "465",
        auth,
      })
    : nodemailer.createTransport({ service: "gmail", auth });
  return transporter;
}

const from = () => `${process.env.GMAIL_FROM_NAME ?? "Paulaner Meets Route 66"} <${process.env.GMAIL_USER}>`;

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const longDate = (date: string, locale: "de" | "en") =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString(locale === "en" ? "en-GB" : "de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/* ---------- Calendar file ---------- */

/* The UTC instant of a wall-clock time in Schweinfurt, daylight saving included. */
function berlinToUtc(date: string, time: string) {
  const guess = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(guess);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asBerlin = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess.getTime() - (asBerlin - guess.getTime()));
}

const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/*
  One event per booking, keyed by its id: a later "changed" email replaces the
  entry in the guest's calendar, a cancellation removes it.
*/
function calendarFile(booking: Booking, venue: Venue, cancel = false) {
  const start = berlinToUtc(booking.date, booking.time);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const sequence = Math.floor(new Date(booking.updatedAt).getTime() / 1000) % 2_000_000_000;
  const summary = booking.locale === "en" ? `Table at ${venue.name}` : `Tisch im ${venue.name}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Paulaner Meets Route 66//Reservierungen//DE",
    `METHOD:${cancel ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${booking.id}@paulaner-route66`,
    `SEQUENCE:${sequence}`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsText(summary)}`,
    `LOCATION:${icsText(`${venue.name}, ${venue.street}, ${venue.city}`)}`,
    `DESCRIPTION:${icsText(`${booking.reference} · ${booking.guests} ${booking.locale === "en" ? (booking.guests === 1 ? "guest" : "guests") : booking.guests === 1 ? "Gast" : "Gäste"}`)}`,
    `STATUS:${cancel ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return {
    filename: cancel ? "reservierung-storniert.ics" : "reservierung.ics",
    content: lines.join("\r\n"),
    contentType: `text/calendar; charset=utf-8; method=${cancel ? "CANCEL" : "PUBLISH"}`,
  };
}

/* ---------- Layout ---------- */

interface Row {
  label: string;
  value: string;
  was?: string; // shown struck through, for changes
}

/* One shared layout: cream card, crimson heading, like the printed menu. */
function layout(heading: string, intro: string, rows: Row[], button: { href: string; label: string } | null, footer = "") {
  return `<!doctype html><html><body style="margin:0;background:#171415;padding:24px;font-family:Helvetica,Arial,sans-serif;color:#1f1a19">
<div style="max-width:560px;margin:0 auto;background:#f3e7da;border-radius:24px;padding:28px;border:1px solid #d6bb9f">
  <p style="margin:0;font-size:12px;letter-spacing:3px;color:#1f78ad;font-weight:bold">PAULANER MEETS ROUTE 66</p>
  <h1 style="margin:8px 0 12px;font-family:Georgia,serif;font-size:26px;color:#b3203a">${escape(heading)}</h1>
  ${intro ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.6">${escape(intro)}</p>` : ""}
  <table style="width:100%;border-collapse:collapse;font-size:15px">${rows
    .map(
      (row) => `<tr>
    <td style="padding:8px 12px 8px 0;color:#6d605a;vertical-align:top;white-space:nowrap">${escape(row.label)}</td>
    <td style="padding:8px 0;white-space:pre-wrap">${
      row.was && row.was !== row.value
        ? `<span style="color:#6d605a;text-decoration:line-through">${escape(row.was)}</span><br><strong style="color:#b3203a">${escape(row.value)}</strong>`
        : escape(row.value)
    }</td></tr>`,
    )
    .join("")}</table>
  ${
    button
      ? `<a href="${escape(button.href)}" style="display:inline-block;margin-top:24px;background:#b3203a;color:#f6efe6;text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:2px;padding:14px 22px;border-radius:999px">${escape(button.label)}</a>`
      : ""
  }
  ${footer ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6d605a">${footer}</p>` : ""}
</div></body></html>`;
}

const textVersion = (heading: string, intro: string, rows: Row[], tail: string[]) =>
  [heading, "", intro, "", ...rows.map((r) => `${r.label}: ${r.was && r.was !== r.value ? `${r.value} (vorher/before: ${r.was})` : r.value}`), "", ...tail]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");

/* ---------- To the bar ---------- */

export async function notifyNewReservation(booking: Booking, origin: string) {
  if (!isMailerConfigured()) return;
  const guests = `${booking.guests} ${booking.guests === 1 ? "Gast" : "Gäste"}`;
  const rows: Row[] = [
    { label: "Nummer", value: booking.reference },
    { label: "Name", value: booking.name },
    { label: "Datum", value: `${longDate(booking.date, "de")}, ${booking.time} Uhr` },
    { label: "Gäste", value: guests },
    { label: "E-Mail", value: booking.email },
  ];
  if (booking.phone) rows.push({ label: "Telefon", value: booking.phone });
  if (booking.note) rows.push({ label: "Nachricht", value: booking.note });
  if (booking.locale === "en") rows.push({ label: "Sprache", value: "Englisch" });
  const adminUrl = `${origin}/admin/bookings`;
  try {
    await mailer().sendMail({
      from: from(),
      to: process.env.RESERVATION_NOTIFY_EMAIL,
      replyTo: booking.email || undefined,
      subject: `Neue Reservierung: ${booking.name}, ${longDate(booking.date, "de")} ${booking.time}, ${guests}`,
      text: textVersion("Neue Tischanfrage.", "", rows, [`Bestätigen oder ablehnen: ${adminUrl}`]),
      html: layout("Neue Reservierung", "Bitte in der Verwaltung bestätigen oder absagen. Der Gast bekommt dann automatisch eine E-Mail.", rows, {
        href: adminUrl,
        label: "IN DER VERWALTUNG ÖFFNEN",
      }),
    });
  } catch (error) {
    console.error("Booking notification email failed:", error);
  }
}

export async function notifyCancellation(booking: Booking, accountEmail: string) {
  if (!isMailerConfigured()) return;
  const when = `${longDate(booking.date, "de")} ${booking.time} Uhr`;
  const rows: Row[] = [
    { label: "Nummer", value: booking.reference },
    { label: "Name", value: booking.name },
    { label: "Datum", value: when },
    { label: "Gäste", value: String(booking.guests) },
    { label: "Konto", value: accountEmail },
  ];
  try {
    await mailer().sendMail({
      from: from(),
      to: process.env.RESERVATION_NOTIFY_EMAIL,
      replyTo: accountEmail.includes("@") ? accountEmail : undefined,
      subject: `Storniert: ${booking.name}, ${when}`,
      text: textVersion("Reservierung vom Gast storniert.", "Der Tisch ist wieder frei.", rows, []),
      html: layout("Vom Gast storniert", "Der Tisch ist wieder frei.", rows, null),
    });
  } catch (error) {
    console.error("Cancellation email failed:", error);
  }
}

/* ---------- To the guest ---------- */

export type GuestMailKind = "received" | "confirmed" | "changed" | "cancelled" | "cancelledByGuest";

const GUEST = {
  de: {
    subject: {
      received: "Anfrage erhalten",
      confirmed: "Reservierung bestätigt",
      changed: "Reservierung geändert",
      cancelled: "Reservierung storniert",
      cancelledByGuest: "Stornierung bestätigt",
    },
    heading: {
      received: "Danke, eure Anfrage ist da.",
      confirmed: "Euer Tisch ist bestätigt.",
      changed: "Eure Reservierung wurde geändert.",
      cancelled: "Eure Reservierung wurde storniert.",
      cancelledByGuest: "Ihr habt eure Reservierung storniert.",
    },
    body: {
      received: "Wir prüfen sie und schicken euch eine weitere E-Mail, sobald sie bestätigt ist.",
      confirmed: "Wir freuen uns auf euch. Den Termin findet ihr im Anhang für euren Kalender. Falls sich etwas ändert, storniert bitte im Profil.",
      changed: "Wir haben eure Reservierung angepasst. Hier die neuen Angaben, der Kalendereintrag im Anhang ist aktualisiert.",
      cancelled: "Diese Reservierung wurde von der Bar storniert. Bei Fragen meldet euch gern bei uns oder reserviert einfach neu.",
      cancelledByGuest: "Danke, dass ihr Bescheid gegeben habt. Der Tisch ist wieder frei. Wir hoffen, euch bald zu sehen.",
    },
    labels: { reference: "Nummer", date: "Datum", time: "Uhrzeit", guests: "Gäste" },
    guests: (n: number) => (n === 1 ? "1 Gast" : `${n} Gäste`),
    time: (time: string) => `${time} Uhr`,
    profile: "IM PROFIL ANSEHEN",
    rebook: "NEU RESERVIEREN",
  },
  en: {
    subject: {
      received: "Request received",
      confirmed: "Booking confirmed",
      changed: "Booking changed",
      cancelled: "Booking cancelled",
      cancelledByGuest: "Cancellation confirmed",
    },
    heading: {
      received: "Thanks, we have your request.",
      confirmed: "Your table is confirmed.",
      changed: "Your booking has been changed.",
      cancelled: "Your booking has been cancelled.",
      cancelledByGuest: "You've cancelled your booking.",
    },
    body: {
      received: "We'll check it and send you another email as soon as it's confirmed.",
      confirmed: "We look forward to seeing you. The calendar file is attached. If anything changes, please cancel on your profile.",
      changed: "We've adjusted your booking. Here are the new details; the attached calendar entry is updated.",
      cancelled: "This booking has been cancelled by the bar. If you have any questions, get in touch, or simply book again.",
      cancelledByGuest: "Thanks for letting us know. The table is free again. We hope to see you soon.",
    },
    labels: { reference: "Reference", date: "Date", time: "Time", guests: "Guests" },
    guests: (n: number) => (n === 1 ? "1 guest" : `${n} guests`),
    time: (time: string) => time,
    profile: "VIEW ON YOUR PROFILE",
    rebook: "BOOK AGAIN",
  },
};

export async function notifyGuest(kind: GuestMailKind, booking: Booking, origin: string, previous?: Pick<Booking, "date" | "time" | "guests">) {
  if (!isMailerConfigured() || !booking.email) return;
  const c = GUEST[booking.locale];
  const { venue } = await getSite();
  const rows: Row[] = [
    { label: c.labels.reference, value: booking.reference },
    { label: c.labels.date, value: longDate(booking.date, booking.locale), was: previous && longDate(previous.date, booking.locale) },
    { label: c.labels.time, value: c.time(booking.time), was: previous && c.time(previous.time) },
    { label: c.labels.guests, value: c.guests(booking.guests), was: previous && c.guests(previous.guests) },
  ];
  const cancelled = kind === "cancelled" || kind === "cancelledByGuest";
  const button = cancelled ? { href: `${origin}/#book`, label: c.rebook } : { href: `${origin}/profile`, label: c.profile };
  const contact = [venue.phone, venue.email].filter(Boolean).join(" · ");
  const address = `${venue.name}, ${venue.street}, ${venue.city}`;
  const attach = kind === "confirmed" || kind === "changed" ? [calendarFile(booking, venue)] : cancelled ? [calendarFile(booking, venue, true)] : [];
  try {
    await mailer().sendMail({
      from: from(),
      to: booking.email,
      replyTo: venue.email || undefined,
      subject: `${c.subject[kind]} – ${longDate(booking.date, booking.locale)}, ${c.time(booking.time)}`,
      text: textVersion(c.heading[kind], c.body[kind], rows, [button.href, address, contact]),
      html: layout(c.heading[kind], c.body[kind], rows, button, `${escape(address)}${contact ? `<br>${escape(contact)}` : ""}`),
      attachments: attach,
    });
  } catch (error) {
    console.error(`Guest email failed (${kind}):`, error);
  }
}

/* The "send test" button in the portal: proves the Gmail login works before a real guest relies on it. */
export async function sendTestEmail(origin: string) {
  if (!isMailerConfigured()) throw new Error("not-configured");
  const rows: Row[] = [
    { label: "Absender", value: process.env.GMAIL_USER ?? "" },
    { label: "Empfänger", value: process.env.RESERVATION_NOTIFY_EMAIL ?? "" },
    { label: "Gesendet", value: new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" }) },
  ];
  await mailer().sendMail({
    from: from(),
    to: process.env.RESERVATION_NOTIFY_EMAIL,
    subject: "Test: E-Mails für Reservierungen funktionieren",
    text: textVersion("Die E-Mails funktionieren.", "Neue Reservierungen und Stornierungen kommen ab jetzt an diese Adresse.", rows, []),
    html: layout("Die E-Mails funktionieren.", "Neue Reservierungen und Stornierungen kommen ab jetzt an diese Adresse; Gäste bekommen ihre Bestätigungen automatisch.", rows, {
      href: `${origin}/admin`,
      label: "ZUR VERWALTUNG",
    }),
  });
}
