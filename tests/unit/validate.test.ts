import { describe, expect, it } from "vitest";
import { DEFAULT_SITE } from "@/lib/data";
import {
  InputError,
  cleanAnnouncement,
  cleanBookingSettings,
  cleanClosures,
  cleanHours,
  cleanMenu,
  cleanSite,
  cleanVenue,
  date,
  imageUrl,
  int,
  status,
  str,
  time,
} from "@/lib/validate";

describe("field checks", () => {
  it("trims, enforces length and required", () => {
    expect(str("  hi  ", 5, "X")).toBe("hi");
    expect(str(undefined, 5, "X")).toBe("");
    expect(() => str("toolong", 3, "X")).toThrow(InputError);
    expect(() => str(" ", 3, "X", { required: true })).toThrow(/darf nicht leer/);
  });

  it("accepts only whole numbers in range", () => {
    expect(int("4", 1, 60, "Gäste")).toBe(4);
    expect(() => int(4.5, 1, 60, "Gäste")).toThrow(InputError);
    expect(() => int(61, 1, 60, "Gäste")).toThrow(InputError);
  });

  it("checks times and real dates", () => {
    expect(time("09:30", "Zeit")).toBe("09:30");
    expect(() => time("24:00", "Zeit")).toThrow(InputError);
    expect(date("2026-02-28", "Datum")).toBe("2026-02-28");
    expect(() => date("2026-13-01", "Datum")).toThrow(InputError);
  });

  it("allows only https image links", () => {
    expect(imageUrl("", "Foto")).toBe("");
    expect(imageUrl("https://images.unsplash.com/x.jpg", "Foto")).toBe("https://images.unsplash.com/x.jpg");
    expect(() => imageUrl("http://example.com/x.jpg", "Foto")).toThrow(InputError);
    expect(() => imageUrl("javascript:alert(1)", "Foto")).toThrow(InputError);
  });

  it("knows only the booking statuses", () => {
    expect(status("confirmed")).toBe("confirmed");
    expect(() => status("deleted")).toThrow(InputError);
  });
});

describe("menu", () => {
  it("normalises prices and gives every drink a unique id", () => {
    const menu = cleanMenu([
      { label: "Bier", drinks: [{ name: "Helles", price: "3,5" }, { name: "Helles", price: "4" }] },
    ]);
    expect(menu[0].drinks.map((d) => d.price)).toEqual(["3.50", "4.00"]);
    const ids = menu[0].drinks.map((d) => d.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("rejects bad prices, an empty card and oversized lists", () => {
    expect(() => cleanMenu([{ label: "Bier", drinks: [{ name: "X", price: "-1" }] }])).toThrow(InputError);
    expect(() => cleanMenu([])).toThrow(/Mindestens eine Kategorie/);
    expect(() => cleanMenu(Array.from({ length: 13 }, (_, i) => ({ label: `K${i}`, drinks: [] })))).toThrow(/Zu viele/);
  });

  it("ignores ids that could break out of an attribute", () => {
    const [category] = cleanMenu([{ id: '"><script>', label: "Wein", drinks: [] }]);
    expect(category.id).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("hours, closures, booking settings", () => {
  it("needs all seven days and drops the close time on a closed day", () => {
    const rows = cleanHours(Array.from({ length: 7 }, (_, i) => (i === 0 ? { open: "", close: "22:00" } : { open: "18:00", close: "01:00" })));
    expect(rows[0]).toMatchObject({ day: "Monday", open: null, close: null });
    expect(() => cleanHours([{ open: "18:00" }])).toThrow(/sieben Tage/);
  });

  it("sorts closures and refuses duplicates", () => {
    expect(cleanClosures([{ date: "2026-12-31" }, { date: "2026-12-24" }]).map((c) => c.date)).toEqual(["2026-12-24", "2026-12-31"]);
    expect(() => cleanClosures([{ date: "2026-12-24" }, { date: "2026-12-24" }])).toThrow(/doppelt/);
  });

  it("falls back to a 30 minute interval", () => {
    expect(cleanBookingSettings({ enabled: "on", maxGuests: 8, lastSeating: "23:00", intervalMinutes: 7 })).toEqual({
      enabled: true,
      maxGuests: 8,
      lastSeating: "23:00",
      intervalMinutes: 30,
    });
  });

  it("requires text for a visible notice", () => {
    expect(() => cleanAnnouncement({ enabled: true, text: "" })).toThrow(InputError);
    expect(cleanAnnouncement({ enabled: false, tone: "bogus" })).toMatchObject({ enabled: false, tone: "info" });
  });
});

describe("venue and backups", () => {
  const venue = { ...DEFAULT_SITE.venue };

  it("checks contact details and links", () => {
    expect(cleanVenue(venue).name).toBe(venue.name);
    expect(() => cleanVenue({ ...venue, email: "nope" })).toThrow(InputError);
    expect(() => cleanVenue({ ...venue, instagram: "https://evil.example/instagram.com/" })).toThrow(InputError);
    expect(() => cleanVenue({ ...venue, maps: "javascript:alert(1)" })).toThrow(InputError);
  });

  it("round-trips the built-in content through a backup", () => {
    const site = cleanSite(structuredClone(DEFAULT_SITE));
    expect(site.menu.length).toBe(DEFAULT_SITE.menu.length);
    expect(site.hours).toHaveLength(7);
  });
});
