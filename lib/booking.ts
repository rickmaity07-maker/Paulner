import type { BookingRules, DayHours } from "@/lib/types";

export interface BookingRequest {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  guests: number;
  name: string;
  email: string;
  phone?: string;
  note?: string;
}

export const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const fromMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/* Monday-first weekday index for a YYYY-MM-DD string, read as a calendar date (no time zone drift). */
export function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/* The opening hours that apply to a date, or null when the bar is shut that day. */
export function hoursOn(date: string, rules: BookingRules): DayHours | null {
  if (rules.closures.some((closure) => closure.date === date)) return null;
  const day = rules.hours[weekdayOf(date)];
  return day?.open ? day : null;
}

/*
  Bookable start times: every interval from opening until the last seating,
  or 90 minutes before a published closing time if that is earlier.
*/
export function slotsFor(date: string, rules: BookingRules) {
  if (!date || !rules.booking.enabled) return [];
  const day = hoursOn(date, rules);
  if (!day?.open) return [];
  const start = toMinutes(day.open);
  let end = toMinutes(rules.booking.lastSeating);
  if (day.close) {
    let close = toMinutes(day.close);
    if (close <= start) close += 24 * 60;
    end = Math.min(end < start ? end + 24 * 60 : end, close - 90);
  }
  const slots: string[] = [];
  for (let minutes = start; minutes <= end; minutes += rules.booking.intervalMinutes) slots.push(fromMinutes(minutes));
  return slots;
}

export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export type BookingErrorCode =
  | "date"
  | "past"
  | "closed"
  | "time"
  | "slot"
  | "guests"
  | "tooMany"
  | "name"
  | "nameLong"
  | "email"
  | "phone"
  | "note";

export type BookingErrors = Partial<Record<keyof BookingRequest, BookingErrorCode>>;

/*
  Shared by the form, the API route and the portal so all three agree. Returns
  codes, not sentences, so each language can word them (see lib/i18n.ts).
*/
export function validateBooking(input: Partial<BookingRequest>, rules: BookingRules, today = todayISO()): BookingErrors {
  const errors: BookingErrors = {};

  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) errors.date = "date";
  else if (input.date < today) errors.date = "past";
  else if (!hoursOn(input.date, rules)) errors.date = "closed";

  if (!input.time) errors.time = "time";
  else if (input.date && !errors.date && !slotsFor(input.date, rules).includes(input.time)) errors.time = "slot";

  if (!input.guests || input.guests < 1) errors.guests = "guests";
  else if (input.guests > rules.booking.maxGuests) errors.guests = "tooMany";

  if (!input.name || input.name.trim().length < 2) errors.name = "name";
  else if (input.name.length > 80) errors.name = "nameLong";

  if (!input.email || input.email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = "email";

  if (input.phone && !/^[+\d][\d\s()/-]{5,24}$/.test(input.phone)) errors.phone = "phone";

  if (input.note && input.note.length > 280) errors.note = "note";

  return errors;
}
