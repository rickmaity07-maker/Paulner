/*
  Shapes shared by the public site, the admin portal and the store.
  Safe to import from client components: no Node APIs here.

  The site is German first, English second: every text a guest reads has a
  German field (the plain name) and an English one (the same name + "En").
*/

export type Locale = "de" | "en";

export interface Venue {
  name: string;
  contactName: string; // the person responsible, for the Impressum
  street: string;
  city: string;
  plusCode: string;
  maps: string;
  rating: string;
  reviews: number;
  priceBand: string;
  phone: string;
  email: string;
  instagram: string;
}

export interface Hero {
  tagline: string;
  taglineEn: string;
  fogWord: string;
  footerWord: string;
  footerLine: string;
  footerLineEn: string;
}

export type AnnouncementTone = "info" | "event" | "warning";

export interface Announcement {
  enabled: boolean;
  text: string;
  textEn: string;
  tone: AnnouncementTone;
}

/* 0 = Monday. `close` null means the closing time isn't published. */
export interface DayHours {
  day: string;
  short: string;
  open: string | null;
  close: string | null;
}

export interface Closure {
  date: string; // YYYY-MM-DD
  reason: string;
}

export interface BookingSettings {
  enabled: boolean;
  maxGuests: number;
  lastSeating: string; // HH:MM, latest bookable start
  intervalMinutes: 15 | 30 | 60;
}

export interface Drink {
  id: string;
  name: string;
  notes: string;
  notesEn: string;
  size: string;
  price: string;
  image: string;
  soldOut: boolean;
  featured: boolean;
}

/* label is the German heading ("Fassbier"), sub the English one ("Draft beer"), as on the printed card. */
export interface MenuCategory {
  id: string;
  label: string;
  sub: string;
  drinks: Drink[];
}

export interface Tap {
  id: string;
  name: string;
  pour: string;
  body: string;
  bodyEn: string;
  image: string;
}

export interface InfoRow {
  id: string;
  label: string;
  labelEn: string;
  title: string;
  titleEn: string;
  body: string;
  bodyEn: string;
  meta: string;
  metaEn: string;
  image: string;
}

export interface SiteContent {
  venue: Venue;
  hero: Hero;
  announcement: Announcement;
  hours: DayHours[];
  closures: Closure[];
  booking: BookingSettings;
  menu: MenuCategory[];
  taps: Tap[];
  info: InfoRow[];
  marquee: string[];
  updatedAt: string;
}

export type BookingStatus = "pending" | "confirmed" | "seated" | "cancelled" | "no-show";

export const BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "seated", "cancelled", "no-show"];

export interface Booking {
  id: string;
  reference: string;
  date: string;
  time: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  note: string;
  status: BookingStatus;
  table: string;
  staffNote: string;
  source: "website" | "phone" | "walk-in";
  locale: Locale;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEntry {
  id: string;
  at: string;
  action: string;
  detail: string;
  userEmail: string;
}

/* What the booking form needs to know to offer times and validate. */
export interface BookingRules {
  hours: DayHours[];
  closures: Closure[];
  booking: BookingSettings;
}

/* Picks the English text when the visitor chose English and one exists, else the German. */
export const pick = (locale: Locale, de: string, en: string | undefined) => (locale === "en" && en?.trim() ? en : de);
