import { toMinutes } from "@/lib/booking";
import type { Dict } from "@/lib/i18n";
import type { Closure, DayHours } from "@/lib/types";

export interface HoursGroup {
  start: number; // weekday index, 0 = Monday
  end: number;
  open: string | null;
  close: string | null;
}

/* Consecutive days with the same hours collapse into one line, e.g. "Mo – Sa". */
export function groupedHours(hours: DayHours[]): HoursGroup[] {
  const groups: HoursGroup[] = [];
  let start = 0;
  for (let i = 1; i <= hours.length; i++) {
    const prev = hours[i - 1];
    const cur = hours[i];
    if (cur && cur.open === prev.open && cur.close === prev.close) continue;
    groups.push({ start, end: i - 1, open: prev.open, close: prev.close });
    start = i;
  }
  return groups;
}

export function describeGroup(group: HoursGroup, t: Dict) {
  const days = group.start === group.end ? t.days[group.start] : `${t.days[group.start]} – ${t.days[group.end]}`;
  const text = group.open ? (group.close ? t.hours.range(group.open, group.close) : t.hours.from(group.open)) : t.hours.closed;
  return { days, text, closed: !group.open };
}

/* Wall-clock time in Schweinfurt, whatever time zone the visitor is in. */
export function berlinNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export type OpenStatus =
  | { open: true; until: string | null }
  | { open: false; next: { day: number; time: string; inDays: number } | null };

/*
  Open right now, and if not, when next. With no published closing time the
  bar counts as open from its opening time until midnight.
*/
export function openStatus(hours: DayHours[], closures: Closure[], now = new Date()): OpenStatus {
  const { date, weekday, minutes } = berlinNow(now);
  const closedToday = closures.some((closure) => closure.date === date);
  const today = hours[weekday];

  if (!closedToday && today?.open) {
    const open = toMinutes(today.open);
    let close = today.close ? toMinutes(today.close) : 24 * 60;
    if (close <= open) close += 24 * 60;
    if (minutes >= open && minutes < close) return { open: true, until: today.close };
    if (minutes < open) return { open: false, next: { day: weekday, time: today.open, inDays: 0 } };
  }

  // Last night's late close can run past midnight.
  const yesterday = hours[(weekday + 6) % 7];
  if (yesterday?.open && yesterday.close && toMinutes(yesterday.close) <= toMinutes(yesterday.open) && minutes < toMinutes(yesterday.close))
    return { open: true, until: yesterday.close };

  for (let step = 1; step <= 7; step++) {
    const day = (weekday + step) % 7;
    if (hours[day]?.open) return { open: false, next: { day, time: hours[day].open!, inDays: step } };
  }
  return { open: false, next: null };
}

export function describeStatus(status: OpenStatus, t: Dict) {
  if (status.open) return status.until ? t.hours.openUntil(status.until) : t.hours.openNow;
  if (!status.next) return t.hours.closed;
  if (status.next.inDays === 0) return t.hours.opensToday(status.next.time);
  if (status.next.inDays === 1) return t.hours.opensTomorrow(status.next.time);
  return t.hours.opensOn(t.daysLong[status.next.day], status.next.time);
}
