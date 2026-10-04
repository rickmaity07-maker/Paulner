import { slug } from "@/lib/data";
import {
  BOOKING_STATUSES,
  type AnnouncementTone,
  type BookingSettings,
  type BookingStatus,
  type Closure,
  type DayHours,
  type Hero,
  type InfoRow,
  type MenuCategory,
  type SiteContent,
  type Tap,
  type Venue,
} from "@/lib/types";

/*
  Everything the portal sends is checked and trimmed here before it is
  written. Server actions are public endpoints, so the client's own checks are
  a convenience, not a guarantee. Messages are German: the portal is.
*/
export class InputError extends Error {}

const fail = (message: string): never => {
  throw new InputError(message);
};

export function str(value: unknown, max: number, label: string, { required = false } = {}) {
  const text = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  if (required && !text) fail(`${label} darf nicht leer sein.`);
  if (text.length > max) fail(`${label} ist zu lang (höchstens ${max} Zeichen).`);
  return text;
}

export const bool = (value: unknown) => value === true || value === "true" || value === "on";

export function int(value: unknown, min: number, max: number, label: string) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) fail(`${label} muss eine ganze Zahl von ${min} bis ${max} sein.`);
  return n;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export function time(value: unknown, label: string): string {
  const text = str(value, 5, label, { required: true });
  if (!TIME.test(text)) fail(`${label} muss wie 15:30 aussehen.`);
  return text;
}
const optionalTime = (value: unknown, label: string) => (value == null || value === "" ? null : time(value, label));

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export function date(value: unknown, label: string) {
  const text = str(value, 10, label, { required: true });
  if (!DATE.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) fail(`${label} muss ein gültiges Datum sein.`);
  return text;
}

/* Photos can live anywhere, but only over https so the page never mixes content. */
export function imageUrl(value: unknown, label: string) {
  const text = str(value, 600, label);
  if (!text) return "";
  try {
    const url = new URL(text);
    if (url.protocol !== "https:") throw new Error();
  } catch {
    fail(`${label} muss ein vollständiger https://-Link sein.`);
  }
  return text;
}

function price(value: unknown, label: string) {
  const text = str(value, 8, label, { required: true }).replace(",", ".");
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0 || n > 999) fail(`${label} muss ein Preis wie 3,50 sein.`);
  return n.toFixed(2);
}

function list<T>(value: unknown, max: number, label: string, each: (item: Record<string, unknown>, index: number) => T): T[] {
  if (!Array.isArray(value)) fail(`${label} fehlt.`);
  const items = value as unknown[];
  if (items.length > max) fail(`Zu viele Einträge bei ${label} (höchstens ${max}).`);
  return items.map((item, index) => each((item ?? {}) as Record<string, unknown>, index));
}

/* Ids keep React keys stable; anything missing or duplicated gets a fresh one. */
function uniqueId(raw: unknown, fallback: string, seen: Set<string>) {
  let id = typeof raw === "string" && /^[a-z0-9-]{1,80}$/.test(raw) ? raw : slug(fallback) || "eintrag";
  while (seen.has(id)) id = `${id}-${Math.random().toString(36).slice(2, 6)}`;
  seen.add(id);
  return id;
}

export function cleanMenu(value: unknown): MenuCategory[] {
  const seen = new Set<string>();
  const categories = list(value, 12, "Kategorien", (c, ci) => {
    const label = str(c.label, 40, `Name von Kategorie ${ci + 1}`, { required: true });
    return {
      id: uniqueId(c.id, label, seen),
      label,
      sub: str(c.sub, 40, `Englischer Name von „${label}“`),
      drinks: list(c.drinks, 80, `Getränke in „${label}“`, (d, di) => {
        const name = str(d.name, 60, `Name von Getränk ${di + 1} in „${label}“`, { required: true });
        return {
          id: uniqueId(d.id, `${label}-${name}`, seen),
          name,
          notes: str(d.notes, 120, `Beschreibung von „${name}“`),
          notesEn: str(d.notesEn, 120, `Englische Beschreibung von „${name}“`),
          size: str(d.size, 20, `Menge von „${name}“`),
          price: price(d.price, `Preis von „${name}“`),
          image: imageUrl(d.image, `Foto von „${name}“`),
          soldOut: bool(d.soldOut),
          featured: bool(d.featured),
        };
      }),
    };
  });
  if (categories.length === 0) fail("Mindestens eine Kategorie muss auf der Karte bleiben.");
  return categories;
}

export function cleanTaps(value: unknown): Tap[] {
  const seen = new Set<string>();
  return list(value, 8, "Zapfhähne", (t, i) => {
    const name = str(t.name, 50, `Name von Zapfhahn ${i + 1}`, { required: true });
    return {
      id: uniqueId(t.id, name, seen),
      name,
      pour: str(t.pour, 40, `Menge & Preis von „${name}“`),
      body: str(t.body, 240, `Beschreibung von „${name}“`),
      bodyEn: str(t.bodyEn, 240, `Englische Beschreibung von „${name}“`),
      image: imageUrl(t.image, `Foto von „${name}“`),
    };
  });
}

export function cleanInfo(value: unknown): InfoRow[] {
  const seen = new Set<string>();
  return list(value, 8, "Infozeilen", (r, i) => {
    const label = str(r.label, 24, `Bezeichnung von Infozeile ${i + 1}`, { required: true });
    return {
      id: uniqueId(r.id, label, seen),
      label,
      labelEn: str(r.labelEn, 24, `Englische Bezeichnung von „${label}“`),
      title: str(r.title, 50, `Überschrift von „${label}“`, { required: true }),
      titleEn: str(r.titleEn, 50, `Englische Überschrift von „${label}“`),
      body: str(r.body, 300, `Text von „${label}“`),
      bodyEn: str(r.bodyEn, 300, `Englischer Text von „${label}“`),
      meta: str(r.meta, 30, `Kurzinfo von „${label}“`),
      metaEn: str(r.metaEn, 30, `Englische Kurzinfo von „${label}“`),
      image: imageUrl(r.image, `Foto von „${label}“`),
    };
  });
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_DE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export function cleanHours(value: unknown): DayHours[] {
  const rows = list(value, 7, "Öffnungszeiten", (d, i) => {
    const open = optionalTime(d.open, `Öffnungszeit ${DAYS_DE[i]}`);
    return {
      day: DAYS[i],
      short: DAYS[i].slice(0, 3),
      open,
      close: open ? optionalTime(d.close, `Schließzeit ${DAYS_DE[i]}`) : null,
    };
  });
  if (rows.length !== 7) fail("Die Öffnungszeiten brauchen alle sieben Tage.");
  return rows;
}

export function cleanClosures(value: unknown): Closure[] {
  const seen = new Set<string>();
  return list(value, 60, "Schließtage", (c) => {
    const d = date(c.date, "Schließtag");
    if (seen.has(d)) fail(`${d} steht doppelt in der Liste.`);
    seen.add(d);
    return { date: d, reason: str(c.reason, 80, "Grund") };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function cleanBookingSettings(value: unknown): BookingSettings {
  const b = (value ?? {}) as Record<string, unknown>;
  const interval = Number(b.intervalMinutes);
  return {
    enabled: bool(b.enabled),
    maxGuests: int(b.maxGuests, 1, 60, "Höchstzahl Gäste online"),
    lastSeating: time(b.lastSeating, "Letzte Reservierungszeit"),
    intervalMinutes: interval === 15 || interval === 60 ? interval : 30,
  };
}

export function cleanHero(value: unknown): Hero {
  const h = (value ?? {}) as Record<string, unknown>;
  return {
    tagline: str(h.tagline, 200, "Begrüßungstext", { required: true }),
    taglineEn: str(h.taglineEn, 200, "Englischer Begrüßungstext"),
    fogWord: str(h.fogWord, 16, "Wort auf der Scheibe", { required: true }),
    footerWord: str(h.footerWord, 16, "Wort auf der Scheibe unten", { required: true }),
    footerLine: str(h.footerLine, 90, "Schlusssatz"),
    footerLineEn: str(h.footerLineEn, 90, "Englischer Schlusssatz"),
  };
}

const TONES: AnnouncementTone[] = ["info", "event", "warning"];
export function cleanAnnouncement(value: unknown) {
  const a = (value ?? {}) as Record<string, unknown>;
  const tone = TONES.includes(a.tone as AnnouncementTone) ? (a.tone as AnnouncementTone) : "info";
  const enabled = bool(a.enabled);
  return {
    enabled,
    tone,
    text: str(a.text, 160, "Hinweis", { required: enabled }),
    textEn: str(a.textEn, 160, "Englischer Hinweis"),
  };
}

export function cleanMarquee(value: unknown): string[] {
  return list(value, 20, "Laufband", (_, i) => str((value as unknown[])[i], 30, `Laufband-Eintrag ${i + 1}`, { required: true }));
}

export function cleanVenue(value: unknown): Venue {
  const v = (value ?? {}) as Record<string, unknown>;
  const email = str(v.email, 120, "E-Mail");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Die E-Mail-Adresse sieht nicht richtig aus.");
  const phone = str(v.phone, 30, "Telefon");
  if (phone && !/^[+\d][\d\s()/-]{5,28}$/.test(phone)) fail("Die Telefonnummer sieht nicht richtig aus.");
  const instagram = str(v.instagram, 200, "Instagram-Link");
  if (instagram && !/^https:\/\/(www\.)?instagram\.com\//.test(instagram)) fail("Instagram muss ein https://instagram.com/…-Link sein.");
  const maps = str(v.maps, 400, "Google-Maps-Link", { required: true });
  if (!/^https:\/\//.test(maps)) fail("Der Google-Maps-Link muss mit https:// beginnen.");
  return {
    name: str(v.name, 60, "Name der Bar", { required: true }),
    contactName: str(v.contactName, 80, "Verantwortliche Person"),
    street: str(v.street, 80, "Straße", { required: true }),
    city: str(v.city, 80, "PLZ und Ort", { required: true }),
    plusCode: str(v.plusCode, 40, "Plus Code"),
    maps,
    rating: str(v.rating, 4, "Bewertung"),
    reviews: int(v.reviews, 0, 100000, "Anzahl Bewertungen"),
    priceBand: str(v.priceBand, 20, "Preisspanne"),
    phone,
    email,
    instagram,
  };
}

/* A whole backup file: every section must pass its own check. */
export function cleanSite(value: unknown): SiteContent {
  const s = (value ?? {}) as Record<string, unknown>;
  return {
    venue: cleanVenue(s.venue),
    hero: cleanHero(s.hero),
    announcement: cleanAnnouncement(s.announcement),
    hours: cleanHours(s.hours),
    closures: cleanClosures(s.closures ?? []),
    booking: cleanBookingSettings(s.booking),
    menu: cleanMenu(s.menu),
    taps: cleanTaps(s.taps ?? []),
    info: cleanInfo(s.info ?? []),
    marquee: cleanMarquee(s.marquee ?? []),
    updatedAt: new Date().toISOString(),
  };
}

export const status = (value: unknown): BookingStatus =>
  BOOKING_STATUSES.includes(value as BookingStatus) ? (value as BookingStatus) : fail("Unbekannter Status.");
