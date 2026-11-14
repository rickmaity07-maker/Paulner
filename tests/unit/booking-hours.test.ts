import { describe, expect, it } from "vitest";
import { slotHasPassed, slotsFor, validateBooking, weekdayOf } from "@/lib/booking";
import { berlinNow, groupedHours, openStatus } from "@/lib/hours";
import type { BookingRules, DayHours } from "@/lib/types";

const day = (name: string, open: string | null, close: string | null): DayHours => ({ day: name, short: name.slice(0, 3), open, close });

/* Mon–Thu shut, Fri + Sat 18:00–02:00, Sun 16:00–22:00. */
const HOURS: DayHours[] = [
  day("Monday", null, null),
  day("Tuesday", null, null),
  day("Wednesday", null, null),
  day("Thursday", null, null),
  day("Friday", "18:00", "02:00"),
  day("Saturday", "18:00", "02:00"),
  day("Sunday", "16:00", "22:00"),
];

const rules = (over: Partial<BookingRules["booking"]> = {}, closures: BookingRules["closures"] = []): BookingRules => ({
  hours: HOURS,
  closures,
  booking: { enabled: true, maxGuests: 12, lastSeating: "23:00", intervalMinutes: 30, ...over },
});

// 2026-11-20 is a Friday, 2026-11-22 a Sunday.
const FRIDAY = "2026-11-20";
const SUNDAY = "2026-11-22";

describe("weekdayOf", () => {
  it("counts Monday as 0 and ignores the local time zone", () => {
    expect(weekdayOf("2026-11-16")).toBe(0);
    expect(weekdayOf(FRIDAY)).toBe(4);
    expect(weekdayOf(SUNDAY)).toBe(6);
  });
});

describe("slotsFor", () => {
  it("runs from opening to the last seating", () => {
    const slots = slotsFor(FRIDAY, rules());
    expect(slots[0]).toBe("18:00");
    expect(slots.at(-1)).toBe("23:00");
    expect(slots).toHaveLength(11);
  });

  it("stops 90 minutes before an earlier closing time", () => {
    expect(slotsFor(SUNDAY, rules()).at(-1)).toBe("20:30");
  });

  it("offers nothing on closed days, closures or while bookings are paused", () => {
    expect(slotsFor("2026-11-16", rules())).toEqual([]);
    expect(slotsFor(FRIDAY, rules({}, [{ date: FRIDAY, reason: "Feier" }]))).toEqual([]);
    expect(slotsFor(FRIDAY, rules({ enabled: false }))).toEqual([]);
  });

  it("can seat after midnight when the last seating is past it", () => {
    expect(slotsFor(FRIDAY, rules({ lastSeating: "00:30" })).at(-1)).toBe("00:30");
  });
});

describe("validateBooking", () => {
  const good = { date: FRIDAY, time: "19:00", guests: 4, name: "Anna", email: "anna@example.com" };
  const today = "2026-11-14";

  it("accepts a complete request", () => {
    expect(validateBooking(good, rules(), today)).toEqual({});
  });

  it("flags each bad field with its own code", () => {
    expect(validateBooking({ ...good, date: "20-11-2026" }, rules(), today).date).toBe("date");
    expect(validateBooking({ ...good, date: "2026-11-13" }, rules(), today).date).toBe("past");
    expect(validateBooking({ ...good, date: "2026-11-16" }, rules(), today).date).toBe("closed");
    expect(validateBooking({ ...good, time: "19:10" }, rules(), today).time).toBe("slot");
    expect(validateBooking({ ...good, guests: 0 }, rules(), today).guests).toBe("guests");
    expect(validateBooking({ ...good, guests: 13 }, rules(), today).guests).toBe("tooMany");
    expect(validateBooking({ ...good, name: "A" }, rules(), today).name).toBe("name");
    expect(validateBooking({ ...good, name: "A".repeat(81) }, rules(), today).name).toBe("nameLong");
    expect(validateBooking({ ...good, email: "anna@" }, rules(), today).email).toBe("email");
    expect(validateBooking({ ...good, phone: "abc" }, rules(), today).phone).toBe("phone");
    expect(validateBooking({ ...good, note: "x".repeat(281) }, rules(), today).note).toBe("note");
  });
});

describe("slotHasPassed", () => {
  it("is false for any day after today", () => {
    expect(slotHasPassed(FRIDAY, "18:00", rules(), { date: "2026-11-19", minutes: 23 * 60 })).toBe(false);
  });

  it("is true for an earlier time today", () => {
    expect(slotHasPassed(FRIDAY, "19:00", rules(), { date: FRIDAY, minutes: 20 * 60 })).toBe(true);
    expect(slotHasPassed(FRIDAY, "21:00", rules(), { date: FRIDAY, minutes: 20 * 60 })).toBe(false);
  });

  it("treats a slot after midnight as later than the evening", () => {
    const late = rules({ lastSeating: "00:30" });
    expect(slotHasPassed(FRIDAY, "00:30", late, { date: FRIDAY, minutes: 23 * 60 })).toBe(false);
  });
});

describe("berlinNow", () => {
  it("reads the wall clock in Schweinfurt, summer and winter", () => {
    expect(berlinNow(new Date("2026-11-14T23:30:00Z"))).toMatchObject({ date: "2026-11-15", minutes: 30 });
    expect(berlinNow(new Date("2026-07-01T22:15:00Z"))).toMatchObject({ date: "2026-07-02", minutes: 15 });
  });
});

describe("openStatus", () => {
  // Friday 2026-11-20 20:00 Berlin (UTC+1 in November).
  it("is open during the evening", () => {
    expect(openStatus(HOURS, [], new Date("2026-11-20T19:00:00Z"))).toEqual({ open: true, until: "02:00" });
  });

  it("is still open after midnight from the night before, even when the bar opens again later that day", () => {
    // Saturday 01:00 Berlin: Friday's 18:00–02:00 is still running.
    expect(openStatus(HOURS, [], new Date("2026-11-21T00:00:00Z"))).toEqual({ open: true, until: "02:00" });
  });

  it("says when it opens next", () => {
    // Saturday 03:00 Berlin: opens again at 18:00 the same day.
    expect(openStatus(HOURS, [], new Date("2026-11-21T02:00:00Z"))).toEqual({ open: false, next: { day: 5, time: "18:00", inDays: 0 } });
    // Monday 12:00: next opening is Friday, four days on.
    expect(openStatus(HOURS, [], new Date("2026-11-16T11:00:00Z"))).toEqual({ open: false, next: { day: 4, time: "18:00", inDays: 4 } });
  });

  it("stays shut on a closure day", () => {
    const status = openStatus(HOURS, [{ date: "2026-11-20", reason: "" }], new Date("2026-11-20T19:00:00Z"));
    expect(status.open).toBe(false);
  });
});

describe("groupedHours", () => {
  it("collapses runs of equal days", () => {
    expect(groupedHours(HOURS)).toEqual([
      { start: 0, end: 3, open: null, close: null },
      { start: 4, end: 5, open: "18:00", close: "02:00" },
      { start: 6, end: 6, open: "16:00", close: "22:00" },
    ]);
  });
});
