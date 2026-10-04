import Link from "next/link";
import { ArrowRight, CalendarBlank, Clock, Fire, Users, Wine } from "@phosphor-icons/react/dist/ssr";
import BarChart, { type BarDatum } from "@/components/admin/BarChart";
import { PendingList, QuickToggles, TodayList } from "@/components/admin/DashboardControls";
import { Card } from "@/components/admin/ui";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { berlinNow, describeStatus, openStatus } from "@/lib/hours";
import { content } from "@/lib/i18n";
import { getActivity, getBookings, getSite } from "@/lib/store";

const de = content.de;
const LIVE = ["pending", "confirmed", "seated"];

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const ago = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  return days === 1 ? "gestern" : `vor ${days} Tagen`;
};

function Stat({ label, value, sub, Icon }: { label: string; value: string | number; sub: string; Icon: typeof Users }) {
  return (
    <Card className="flex flex-col gap-3">
      <span className="flex items-center gap-2 text-sm text-sage">
        <Icon size={18} weight="duotone" className="text-amber" aria-hidden="true" /> {label}
      </span>
      <span className="display text-5xl leading-none text-bone">{value}</span>
      <span className="text-sm text-sage">{sub}</span>
    </Card>
  );
}

export default async function Dashboard() {
  const me = await requireOwner();
  const [site, bookings, activity, [{ accounts }]] = await Promise.all([
    getSite(),
    getBookings(),
    getActivity(8),
    db()`select count(*)::int as accounts from users where active`.then((rows) => rows as { accounts: number }[]),
  ]);

  const { date: today } = berlinNow();
  const live = bookings.filter((b) => LIVE.includes(b.status));
  const todays = live.filter((b) => b.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const covers = todays.reduce((n, b) => n + b.guests, 0);
  const weekEnd = addDays(today, 7);
  const week = live.filter((b) => b.date >= today && b.date < weekEnd);
  const pending = bookings.filter((b) => b.status === "pending" && b.date >= today).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const drinks = site.menu.flatMap((c) => c.drinks);
  const soldOut = drinks.filter((d) => d.soldOut).length;

  // Guests per day for the next two weeks.
  const days: BarDatum[] = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i);
    const dayBookings = live.filter((b) => b.date === date);
    const d = new Date(`${date}T12:00:00Z`);
    return {
      key: date,
      label: i === 0 ? "Heute" : `${d.getUTCDate()}.`,
      detail: d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
      value: dayBookings.reduce((n, b) => n + b.guests, 0),
      sub: `${dayBookings.length} ${dayBookings.length === 1 ? "Reservierung" : "Reservierungen"}`,
      highlight: i === 0,
    };
  });

  // When guests like to arrive, across every booking that wasn't cancelled.
  const bySlot = new Map<string, number>();
  for (const b of bookings) if (b.status !== "cancelled") bySlot.set(b.time, (bySlot.get(b.time) ?? 0) + 1);
  const slots: BarDatum[] = [...bySlot.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, count]) => ({ key: time, label: time, detail: `${time} Uhr`, value: count }));
  const busiest = [...bySlot.entries()].sort((a, b) => b[1] - a[1])[0];

  const status = describeStatus(openStatus(site.hours, site.closures), de);
  const hour = Number(new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "numeric" }).format(new Date()));
  const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Hallo" : "Guten Abend";

  return (
    <>
      <header className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-sage">
            {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Berlin" })} · {status}
          </p>
          <h1 className="display mt-1 text-4xl md:text-5xl">
            {greeting}
            {me.name ? `, ${me.name.split(" ")[0]}` : ""}.
          </h1>
        </div>
        <Link href="/admin/bookings" className="inline-flex items-center gap-2 text-sm font-medium text-amber">
          Alle Reservierungen <ArrowRight size={16} />
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Heute" value={covers} sub={`${covers === 1 ? "Gast" : "Gäste"} an ${todays.length} ${todays.length === 1 ? "Tisch" : "Tischen"}`} Icon={Users} />
        <Stat label="Offene Anfragen" value={pending.length} sub={pending.length ? "warten auf Bestätigung" : "alles bestätigt"} Icon={Clock} />
        <Stat label="Nächste 7 Tage" value={week.length} sub={`${week.reduce((n, b) => n + b.guests, 0)} Gäste erwartet`} Icon={CalendarBlank} />
        <Stat label="Karte" value={drinks.length} sub={soldOut ? `${soldOut} ausverkauft` : "alles verfügbar"} Icon={Wine} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Gäste pro Tag, nächste 14 Tage" className="lg:col-span-2">
          <BarChart data={days} units={["Gast", "Gäste"]} />
        </Card>
        <Card title="Schnellschalter">
          <QuickToggles
            bookingsOn={site.booking.enabled}
            announcementOn={site.announcement.enabled}
            announcementText={site.announcement.text}
          />
          <div className="mt-5 rounded-2xl bg-night/60 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <Users size={16} className="text-route" /> {accounts} {accounts === 1 ? "Konto" : "Konten"}
            </p>
            <p className="mt-1 text-sage">Gäste reservieren mit ihrem eigenen Konto.</p>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={`Offene Anfragen${pending.length ? ` (${pending.length})` : ""}`}>
          <PendingList bookings={pending.slice(0, 8)} />
        </Card>
        <Card title="Heute Abend">
          <TodayList bookings={todays} />
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Beliebteste Ankunftszeiten"
          className="lg:col-span-2"
          action={
            busiest && (
              <span className="inline-flex items-center gap-1.5 text-sm text-sage">
                <Fire size={16} weight="fill" className="text-amber" /> {busiest[0]} Uhr
              </span>
            )
          }
        >
          {slots.length ? (
            <BarChart data={slots} units={["Reservierung", "Reservierungen"]} height={180} />
          ) : (
            <p className="text-sm text-sage">Sobald Reservierungen eingehen, seht ihr hier, wann die meisten Gäste kommen.</p>
          )}
        </Card>
        <Card
          title="Zuletzt passiert"
          action={
            <Link href="/admin/activity" className="text-sm text-amber">
              Alles
            </Link>
          }
        >
          {activity.length ? (
            <ul className="flex flex-col gap-3">
              {activity.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <p className="font-medium">{entry.action}</p>
                  <p className="truncate text-sage">
                    {ago(entry.at)}
                    {entry.userEmail && ` · ${entry.userEmail}`}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-sage">Noch nichts protokolliert.</p>
          )}
        </Card>
      </div>
    </>
  );
}
