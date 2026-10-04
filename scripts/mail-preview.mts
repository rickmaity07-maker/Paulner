/*
  Sends every booking email to a throwaway Ethereal inbox and prints preview links.
    npm run mail:preview
*/
import nodemailer from "nodemailer";

const account = await nodemailer.createTestAccount();
Object.assign(process.env, {
  SMTP_HOST: account.smtp.host,
  SMTP_PORT: String(account.smtp.port),
  GMAIL_USER: account.user,
  GMAIL_APP_PASSWORD: account.pass,
  RESERVATION_NOTIFY_EMAIL: "bar@example.com",
});

// Imported after the env is set: the transporter reads it on first use.
const mail = await import("../lib/mailer");

const booking = {
  id: "00000000-0000-4000-8000-000000000001",
  reference: "R66-TEST1",
  userId: null,
  name: "Anna Beispiel",
  email: "anna@example.com",
  phone: "+49 9721 123456",
  date: "2026-10-09",
  time: "19:30",
  guests: 4,
  note: "Geburtstag",
  locale: "de" as const,
  status: "confirmed" as const,
  table: "",
  staffNote: "",
  source: "website" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const origin = "https://paulaner-teal.vercel.app";
await mail.notifyNewReservation(booking, origin);
await mail.notifyGuest("received", booking, origin);
await mail.notifyGuest("confirmed", booking, origin);
await mail.notifyGuest("changed", { ...booking, time: "20:30", guests: 6 }, origin, { date: booking.date, time: booking.time, guests: booking.guests });
await mail.notifyGuest("cancelled", booking, origin);
await mail.notifyGuest("cancelledByGuest", { ...booking, locale: "en" }, origin);
await mail.notifyCancellation(booking, booking.email);
await mail.sendTestEmail(origin);
console.log(`All emails sent. Read them at https://ethereal.email/login with ${account.user} / ${account.pass}`);
