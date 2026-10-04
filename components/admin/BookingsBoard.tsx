"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CaretDown,
  DownloadSimple,
  EnvelopeSimple,
  Globe,
  MagnifyingGlass,
  PersonSimpleWalk,
  Phone,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";
import { confirmAllPending, createStaffBooking, removeBooking, saveBookingDetails, setBookingStatus } from "@/app/admin/actions";
import { Button, Card, ConfirmButton, Field, Input, Select, STATUS_META, StatusBadge, Textarea, useAction } from "@/components/admin/ui";
import { BOOKING_STATUSES, type Booking, type BookingStatus } from "@/lib/types";

type Range = "today" | "upcoming" | "past" | "all";
const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "Heute" },
  { id: "upcoming", label: "Anstehend" },
  { id: "past", label: "Vergangen" },
  { id: "all", label: "Alle" },
];

const SOURCE = {
  website: { label: "Website", Icon: Globe },
  phone: { label: "Telefon", Icon: Phone },
  "walk-in": { label: "Laufkundschaft", Icon: PersonSimpleWalk },
} as const;

const dayHeading = (date: string, today: string) => {
  const label = new Date(`${date}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return date === today ? `Heute · ${label}` : label;
};

function BookingRow({ booking }: { booking: Booking }) {
  const [open, setOpen] = useState(false);
  const [table, setTable] = useState(booking.table);
  const [staffNote, setStaffNote] = useState(booking.staffNote);
  const [guests, setGuests] = useState(booking.guests);
  const [time, setTime] = useState(booking.time);
  const [date, setDate] = useState(booking.date);
  const { pending, run } = useAction();
  const source = SOURCE[booking.source];
  const changed =
    table !== booking.table || staffNote !== booking.staffNote || guests !== booking.guests || time !== booking.time || date !== booking.date;

  return (
    <li className={`rounded-2xl bg-white ring-1 transition-shadow ${open ? "ring-route/40 shadow-lg" : "ring-bone/[0.06] hover:ring-bone/15"}`}>
      <div className="flex flex-wrap items-center gap-3 p-3 md:flex-nowrap md:gap-4 md:p-4">
        <span className="w-14 shrink-0 font-mono text-lg">{booking.time}</span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
          <span className="block truncate font-semibold">{booking.name}</span>
          <span className="flex flex-wrap items-center gap-x-2 text-sm text-sage">
            <span>
              {booking.guests} {booking.guests === 1 ? "Gast" : "Gäste"}
            </span>
            {booking.table && <span>· Tisch {booking.table}</span>}
            <span className="inline-flex items-center gap-1">
              · <source.Icon size={13} /> {source.label}
            </span>
            {booking.note && <span className="truncate italic">· „{booking.note}“</span>}
          </span>
        </button>
        <StatusBadge status={booking.status} />
        <Select
          aria-label={`Status für ${booking.name}`}
          value={booking.status}
          disabled={pending}
          onChange={(event) => run(() => setBookingStatus(booking.id, event.target.value as BookingStatus))}
          className="!w-auto !py-1.5 text-sm"
        >
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Details schließen" : "Details öffnen"}
          className="flex h-9 w-9 items-center justify-center rounded-full text-sage transition-colors hover:bg-night"
        >
          <CaretDown size={16} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-5 border-t border-bone/[0.06] p-4 md:grid-cols-2">
              <div className="flex flex-col gap-3 text-sm">
                <p className="font-mono text-xs text-sage">
                  {booking.reference} · eingegangen {new Date(booking.createdAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" })}
                  {booking.locale === "en" && " · bucht auf Englisch"}
                </p>
                {booking.email && (
                  <a href={`mailto:${booking.email}`} className="inline-flex items-center gap-2 text-route hover:underline">
                    <EnvelopeSimple size={16} /> {booking.email}
                  </a>
                )}
                {booking.phone && (
                  <a href={`tel:${booking.phone.replace(/[^+\d]/g, "")}`} className="inline-flex items-center gap-2 text-route hover:underline">
                    <Phone size={16} /> {booking.phone}
                  </a>
                )}
                {booking.note && (
                  <blockquote className="rounded-xl bg-night/60 px-3 py-2 text-bone">
                    <span className="block text-xs text-sage">Nachricht vom Gast</span>„{booking.note}“
                  </blockquote>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <ConfirmButton prompt="Endgültig löschen?" busy={pending} onConfirm={() => run(() => removeBooking(booking.id))}>
                    <Trash size={14} /> Löschen
                  </ConfirmButton>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Datum">{(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
                <Field label="Uhrzeit">{(id) => <Input id={id} type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} />}</Field>
                <Field label="Gäste">
                  {(id) => <Input id={id} type="number" min={1} max={60} value={guests} onChange={(e) => setGuests(Number(e.target.value))} />}
                </Field>
                <Field label="Tisch">{(id) => <Input id={id} value={table} placeholder="z. B. 4 oder Terrasse" onChange={(e) => setTable(e.target.value)} />}</Field>
                <Field label="Interne Notiz" className="col-span-2" hint="Nur hier sichtbar, nie für den Gast.">
                  {(id) => <Textarea id={id} rows={2} value={staffNote} onChange={(e) => setStaffNote(e.target.value)} />}
                </Field>
                <div className="col-span-2">
                  <Button
                    variant="dark"
                    size="sm"
                    disabled={!changed}
                    busy={pending}
                    onClick={() => run(() => saveBookingDetails(booking.id, { table, staffNote, guests, time, date }))}
                  >
                    Änderungen speichern
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function NewBooking({ today, onClose }: { today: string; onClose: () => void }) {
  const [form, setForm] = useState({ source: "phone", date: today, time: "18:00", guests: 2, name: "", phone: "", email: "", note: "", table: "", status: "confirmed" });
  const set = (key: keyof typeof form) => (value: string | number) => setForm((f) => ({ ...f, [key]: value }));
  const { pending, run } = useAction();

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6">
      <Card
        title="Reservierung eintragen"
        action={
          <button type="button" onClick={onClose} aria-label="Schließen" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-night">
            <X size={16} />
          </button>
        }
      >
        <div className="mb-4 inline-flex rounded-full bg-night p-1">
          {(["phone", "walk-in"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setForm((f) => ({ ...f, source: s, status: s === "walk-in" ? "seated" : "confirmed", date: s === "walk-in" ? today : f.date }))}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${form.source === s ? "bg-asphalt text-chrome" : "text-sage"}`}
            >
              {s === "phone" ? <Phone size={15} /> : <PersonSimpleWalk size={15} />} {SOURCE[s].label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Name">{(id) => <Input id={id} value={form.name} onChange={(e) => set("name")(e.target.value)} />}</Field>
          <Field label="Datum">{(id) => <Input id={id} type="date" value={form.date} onChange={(e) => set("date")(e.target.value)} />}</Field>
          <Field label="Uhrzeit">{(id) => <Input id={id} type="time" step={900} value={form.time} onChange={(e) => set("time")(e.target.value)} />}</Field>
          <Field label="Gäste">{(id) => <Input id={id} type="number" min={1} max={60} value={form.guests} onChange={(e) => set("guests")(Number(e.target.value))} />}</Field>
          <Field label="Telefon">{(id) => <Input id={id} type="tel" value={form.phone} onChange={(e) => set("phone")(e.target.value)} />}</Field>
          <Field label="E-Mail (optional)">{(id) => <Input id={id} type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} />}</Field>
          <Field label="Tisch">{(id) => <Input id={id} value={form.table} onChange={(e) => set("table")(e.target.value)} />}</Field>
          <Field label="Notiz">{(id) => <Input id={id} value={form.note} onChange={(e) => set("note")(e.target.value)} />}</Field>
        </div>
        <Button className="mt-5" variant="primary" busy={pending} onClick={() => run(() => createStaffBooking(form), onClose)}>
          <Plus size={16} weight="bold" /> Eintragen
        </Button>
      </Card>
    </motion.div>
  );
}

export default function BookingsBoard({ bookings, today }: { bookings: Booking[]; today: string }) {
  const [range, setRange] = useState<Range>("upcoming");
  const [statuses, setStatuses] = useState<BookingStatus[]>([]);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const { pending, run } = useAction();

  const inRange = useMemo(
    () =>
      bookings.filter((b) =>
        range === "today" ? b.date === today : range === "upcoming" ? b.date >= today : range === "past" ? b.date < today : true,
      ),
    [bookings, range, today],
  );

  const counts = useMemo(() => {
    const map = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0])) as Record<BookingStatus, number>;
    for (const b of inRange) map[b.status]++;
    return map;
  }, [inRange]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inRange
      .filter((b) => statuses.length === 0 || statuses.includes(b.status))
      .filter((b) => !q || [b.name, b.email, b.phone, b.reference, b.note, b.table].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => {
        const key = `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);
        return range === "past" ? -key : key;
      });
  }, [inRange, statuses, query, range]);

  const groups = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of visible) map.set(b.date, [...(map.get(b.date) ?? []), b]);
    return [...map.entries()];
  }, [visible]);

  const pendingCount = bookings.filter((b) => b.status === "pending" && b.date >= today).length;

  return (
    <>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="display text-4xl md:text-5xl">Reservierungen</h1>
          <p className="mt-2 text-sage">Anfragen von der Website, telefonische Reservierungen und Laufkundschaft an einem Ort.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pendingCount > 0 && (
            <Button variant="dark" busy={pending} onClick={() => run(() => confirmAllPending())}>
              {pendingCount} offene bestätigen
            </Button>
          )}
          <a
            href="/admin/export?type=bookings"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium ring-1 ring-inset ring-bone/15 transition-colors hover:bg-night"
          >
            <DownloadSimple size={16} /> Excel-Export
          </a>
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus size={16} weight="bold" /> Eintragen
          </Button>
        </div>
      </header>

      <AnimatePresence>{adding && <NewBooking today={today} onClose={() => setAdding(false)} />}</AnimatePresence>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit rounded-full bg-white p-1 ring-1 ring-bone/[0.06]">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={range === r.id}
              onClick={() => setRange(r.id)}
              className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${range === r.id ? "text-chrome" : "text-sage hover:text-bone"}`}
            >
              {range === r.id && <motion.span layoutId="range-pill" className="absolute inset-0 rounded-full bg-asphalt" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative">{r.label}</span>
            </button>
          ))}
        </div>
        <label className="relative w-full lg:w-80">
          <span className="sr-only">Suchen</span>
          <MagnifyingGlass size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, E-Mail, Telefon, Nummer" className="!bg-white pl-10" />
        </label>
      </div>

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Nach Status filtern">
        {BOOKING_STATUSES.map((s) => {
          const on = statuses.includes(s);
          const { label, Icon } = STATUS_META[s];
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => setStatuses((all) => (on ? all.filter((x) => x !== s) : [...all, s]))}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
                on ? "bg-asphalt text-chrome" : "bg-white text-bone ring-1 ring-bone/10 hover:ring-bone/25"
              }`}
            >
              <Icon size={14} weight="bold" /> {label} <span className={on ? "text-chrome/60" : "text-sage"}>{counts[s]}</span>
            </button>
          );
        })}
        {statuses.length > 0 && (
          <button type="button" onClick={() => setStatuses([])} className="px-2 text-sm text-amber">
            Filter zurücksetzen
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sage">
            {bookings.length === 0 ? "Noch keine Reservierungen. Sobald Gäste über die Website anfragen, erscheinen sie hier." : "Keine Reservierungen für diese Auswahl."}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-3 flex items-baseline justify-between gap-4 text-sm">
                <span className="font-semibold">{dayHeading(date, today)}</span>
                <span className="text-sage">
                  {items.filter((b) => b.status !== "cancelled").reduce((n, b) => n + b.guests, 0)} Gäste · {items.length}{" "}
                  {items.length === 1 ? "Eintrag" : "Einträge"}
                </span>
              </h2>
              <ul className="flex flex-col gap-2">
                {items.map((b) => (
                  <BookingRow key={`${b.id}-${b.updatedAt}`} booking={b} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
