import type { PayMethod, TabStatus } from "./deckel";

/* German labels and formatting for the tab data shown in the admin portal. */

export const eur = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export const clock = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }) : "–";

export const day = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Berlin" });

export const METHOD_LABEL: Record<PayMethod, string> = {
  cash: "Bar",
  card_terminal: "Karte (Gerät)",
  tap_to_pay: "Tap to Pay",
  other: "Sonstiges",
};

export const TAB_STATUS: Record<TabStatus, { label: string; className: string }> = {
  open: { label: "Offen", className: "bg-gold/15 text-[#8a5a10]" },
  closed: { label: "Abgeschlossen", className: "bg-emerald-600/12 text-emerald-800" },
  on_account: { label: "Angeschrieben", className: "bg-route/12 text-route" },
  void: { label: "Storniert", className: "bg-bone/8 text-sage" },
};

/* The calendar day in Berlin a timestamp falls on, as YYYY-MM-DD. */
export const berlinDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });

export const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const minutesSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

export const duration = (minutes: number) => (minutes < 60 ? `${minutes} Min.` : `${Math.floor(minutes / 60)} Std. ${minutes % 60} Min.`);
