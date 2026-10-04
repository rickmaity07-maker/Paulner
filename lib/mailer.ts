import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getSite } from "@/lib/store";
import type { Booking } from "@/lib/types";

/*
  Booking emails, set up like the Bar-05 and Atlantic sites: a Gmail account
  with 2-Step Verification and an App Password (myaccount.google.com/apppasswords).
  SMTP_HOST switches to any other mail server with the same user and password.
  Nothing is sent until GMAIL_USER, GMAIL_APP_PASSWORD and RESERVATION_NOTIFY_EMAIL are set,
  and no email failure ever loses or blocks a booking.
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

/* One shared layout: cream card, crimson heading, like the printed menu. */
function layout(heading: string, intro: string, rows: [string, string][], button: { href: string; label: string }, footer = "") {
  return `<!doctype html><html><body style="margin:0;background:#171415;padding:24px;font-family:Helvetica,Arial,sans-serif;color:#1f1a19">
<div style="max-width:560px;margin:0 auto;background:#f3e7da;border-radius:24px;padding:28px;border:1px solid #d6bb9f">
  <p style="margin:0;font-size:12px;letter-spacing:3px;color:#1f78ad;font-weight:bold">PAULANER MEETS ROUTE 66</p>
  <h1 style="margin:8px 0 12px;font-family:Georgia,serif;font-size:26px;color:#b3203a">${escape(heading)}</h1>
  ${intro ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.6">${escape(intro)}</p>` : ""}
  <table style="width:100%;border-collapse:collapse;font-size:15px">${rows
    .map(
      ([label, value]) => `<tr>
    <td style="padding:8px 12px 8px 0;color:#6d605a;vertical-align:top;white-space:nowrap">${escape(label)}</td>
    <td style="padding:8px 0;white-space:pre-wrap">${escape(value)}</td></tr>`,
    )
    .join("")}</table>
  <a href="${escape(button.href)}" style="display:inline-block;margin-top:24px;background:#b3203a;color:#f6efe6;text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:2px;padding:14px 22px;border-radius:999px">${escape(button.label)}</a>
  ${footer ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6d605a">${footer}</p>` : ""}
</div></body></html>`;
}

/* Tells the bar about a new request. */
export async function notifyNewReservation(booking: Booking, origin: string) {
  if (!isMailerConfigured()) return;
  const guests = `${booking.guests} ${booking.guests === 1 ? "Gast" : "Gäste"}`;
  const rows: [string, string][] = [
    ["Nummer", booking.reference],
    ["Name", booking.name],
    ["Datum", `${longDate(booking.date, "de")}, ${booking.time} Uhr`],
    ["Gäste", guests],
    ["E-Mail", booking.email],
  ];
  if (booking.phone) rows.push(["Telefon", booking.phone]);
  if (booking.note) rows.push(["Nachricht", booking.note]);
  const adminUrl = `${origin}/admin/bookings`;
  try {
    await mailer().sendMail({
      from: from(),
      to: process.env.RESERVATION_NOTIFY_EMAIL,
      replyTo: booking.email || undefined,
      subject: `Neue Reservierung: ${booking.name}, ${longDate(booking.date, "de")} ${booking.time}, ${guests}`,
      text: ["Neue Tischanfrage.", "", ...rows.map(([l, v]) => `${l}: ${v}`), "", `Bestätigen oder ablehnen: ${adminUrl}`].join("\n"),
      html: layout("Neue Reservierung", "", rows, { href: adminUrl, label: "IN DER VERWALTUNG ÖFFNEN" }),
    });
  } catch (error) {
    console.error("Booking notification email failed:", error);
  }
}

/* Tells the bar that a guest cancelled from their profile, so the table can be given away. */
export async function notifyCancellation(booking: Booking, accountEmail: string) {
  if (!isMailerConfigured()) return;
  const when = `${longDate(booking.date, "de")} ${booking.time} Uhr`;
  const lines = [`Reservierung vom Gast storniert.`, "", `Nummer: ${booking.reference}`, `Name: ${booking.name}`, `Datum: ${when}`, `Gäste: ${booking.guests}`, `Konto: ${accountEmail}`];
  try {
    await mailer().sendMail({
      from: from(),
      to: process.env.RESERVATION_NOTIFY_EMAIL,
      replyTo: accountEmail,
      subject: `Storniert: ${booking.name}, ${when}`,
      text: lines.join("\n"),
    });
  } catch (error) {
    console.error("Cancellation email failed:", error);
  }
}

export type GuestMailKind = "received" | "confirmed" | "cancelled";

const GUEST = {
  de: {
    subject: { received: "Anfrage erhalten", confirmed: "Reservierung bestätigt", cancelled: "Reservierung storniert" },
    heading: { received: "Danke, eure Anfrage ist da.", confirmed: "Euer Tisch ist bestätigt.", cancelled: "Eure Reservierung wurde storniert." },
    body: {
      received: "Wir prüfen sie und schicken euch eine weitere E-Mail, sobald sie bestätigt ist.",
      confirmed: "Wir freuen uns auf euch. Falls sich etwas ändert, storniert bitte im Profil.",
      cancelled: "Diese Reservierung wurde storniert. Bei Fragen meldet euch gern bei uns.",
    },
    labels: { reference: "Nummer", date: "Datum", time: "Uhrzeit", guests: "Gäste" },
    guests: (n: number) => (n === 1 ? "1 Gast" : `${n} Gäste`),
    time: (time: string) => `${time} Uhr`,
    profile: "IM PROFIL ANSEHEN",
  },
  en: {
    subject: { received: "Request received", confirmed: "Booking confirmed", cancelled: "Booking cancelled" },
    heading: { received: "Thanks, we have your request.", confirmed: "Your table is confirmed.", cancelled: "Your booking has been cancelled." },
    body: {
      received: "We'll check it and send you another email as soon as it's confirmed.",
      confirmed: "We look forward to seeing you. If anything changes, please cancel on your profile.",
      cancelled: "This booking has been cancelled. If you have any questions, get in touch.",
    },
    labels: { reference: "Reference", date: "Date", time: "Time", guests: "Guests" },
    guests: (n: number) => (n === 1 ? "1 guest" : `${n} guests`),
    time: (time: string) => time,
    profile: "VIEW ON YOUR PROFILE",
  },
};

/* Emails the guest about their own booking, in the language they booked in. */
export async function notifyGuest(kind: GuestMailKind, booking: Booking, origin: string) {
  if (!isMailerConfigured() || !booking.email) return;
  const c = GUEST[booking.locale];
  const { venue } = await getSite();
  const date = longDate(booking.date, booking.locale);
  const rows: [string, string][] = [
    [c.labels.reference, booking.reference],
    [c.labels.date, date],
    [c.labels.time, c.time(booking.time)],
    [c.labels.guests, c.guests(booking.guests)],
  ];
  const address = `${venue.name}, ${venue.street}, ${venue.city}`;
  try {
    await mailer().sendMail({
      from: from(),
      to: booking.email,
      subject: `${c.subject[kind]} – ${date}, ${booking.time}`,
      text: [c.heading[kind], "", c.body[kind], "", ...rows.map(([l, v]) => `${l}: ${v}`), "", `${origin}/profile`, address].join("\n"),
      html: layout(c.heading[kind], c.body[kind], rows, { href: `${origin}/profile`, label: c.profile }, escape(address)),
    });
  } catch (error) {
    console.error(`Guest email failed (${kind}):`, error);
  }
}
