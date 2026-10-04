import { getSession } from "@/lib/auth";
import { getBookings, getSite } from "@/lib/store";

/* Spreadsheet apps run cells starting with = + - @ as formulas, so those get a leading quote. */
const cell = (value: unknown) => {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

/* GET /admin/export?type=bookings (CSV for Excel) or ?type=backup (menu and texts, as JSON). */
export async function GET(request: Request) {
  const me = await getSession();
  if (!me || me.role !== "owner") return new Response("Nicht angemeldet", { status: 401 });
  const type = new URL(request.url).searchParams.get("type");
  const stamp = new Date().toISOString().slice(0, 10);

  if (type === "backup") {
    const site = await getSite();
    return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), site }, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="paulaner-route66-sicherung-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const bookings = await getBookings();
  const columns = [
    ["reference", "Nummer"],
    ["date", "Datum"],
    ["time", "Uhrzeit"],
    ["guests", "Gäste"],
    ["name", "Name"],
    ["email", "E-Mail"],
    ["phone", "Telefon"],
    ["status", "Status"],
    ["table", "Tisch"],
    ["source", "Quelle"],
    ["note", "Nachricht"],
    ["staffNote", "Interne Notiz"],
    ["createdAt", "Eingegangen"],
  ] as const;
  // Semicolons, because German Excel expects them.
  const csv = [columns.map(([, label]) => label).join(";"), ...bookings.map((b) => columns.map(([key]) => cell(b[key])).join(";"))].join("\r\n");
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paulaner-route66-reservierungen-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
