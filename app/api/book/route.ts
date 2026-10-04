import { after } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { validateBooking, type BookingRequest } from "@/lib/booking";
import { hasDatabase } from "@/lib/db";
import { notifyGuest, notifyNewReservation } from "@/lib/mailer";
import { addBooking, getSite } from "@/lib/store";

/*
  Booking requests from the website. As on Bar-05, a guest books with their
  account: the request is tied to it, shows on their profile, and lands in the
  portal as "pending" for the bar to confirm.
*/
export async function POST(request: Request) {
  if (!hasDatabase()) return Response.json({ code: "unavailable" }, { status: 503 });
  const me = await getSession();
  if (!me) return Response.json({ code: "signIn" }, { status: 401 });

  let body: Partial<BookingRequest> & { locale?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "invalid" }, { status: 400 });
  }

  const site = await getSite();
  if (!site.booking.enabled) return Response.json({ code: "paused" }, { status: 403 });

  const clean: BookingRequest = {
    date: String(body.date ?? ""),
    time: String(body.time ?? ""),
    guests: Number(body.guests),
    name: String(body.name ?? "").trim(),
    email: me.email,
    phone: String(body.phone ?? "").trim(),
    note: String(body.note ?? "").trim(),
  };

  const errors = validateBooking(clean, site);
  if (Object.keys(errors).length > 0) return Response.json({ code: "errors", errors }, { status: 422 });

  const booking = await addBooking({
    userId: me.id,
    date: clean.date,
    time: clean.time,
    guests: clean.guests,
    name: clean.name,
    email: clean.email,
    phone: clean.phone ?? "",
    note: clean.note ?? "",
    locale: body.locale === "en" ? "en" : "de",
    status: "pending",
    table: "",
    staffNote: "",
    source: "website",
  });
  await logActivity(me, "Neue Reservierung", "reservation", booking.id, `${booking.reference} · ${booking.name} · ${booking.guests} am ${booking.date} ${booking.time}`);

  const origin = new URL(request.url).origin;
  after(async () => {
    await notifyNewReservation(booking, origin);
    await notifyGuest("received", booking, origin);
  });

  return Response.json({ reference: booking.reference }, { status: 201 });
}
