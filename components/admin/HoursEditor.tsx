"use client";

import { useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import { saveHours } from "@/app/admin/actions";
import { Button, Card, Field, Input, PageHeader, SaveBar, Select, Toggle, useAction, useDraft } from "@/components/admin/ui";
import { slotsFor, todayISO } from "@/lib/booking";
import { describeGroup, describeStatus, groupedHours, openStatus } from "@/lib/hours";
import { content } from "@/lib/i18n";
import type { BookingSettings, Closure, DayHours } from "@/lib/types";

const DAYS_DE = content.de.daysLong;

interface Draft {
  hours: DayHours[];
  closures: Closure[];
  booking: BookingSettings;
}

export default function HoursEditor(initial: Draft) {
  const { draft, setDraft, dirty, discard, markSaved } = useDraft<Draft>(initial);
  const { pending, run } = useAction();
  const [newClosure, setNewClosure] = useState<Closure>({ date: "", reason: "" });

  const setDay = (i: number, patch: Partial<DayHours>) =>
    setDraft((d) => ({ ...d, hours: d.hours.map((h, j) => (j === i ? { ...h, ...patch } : h)) }));
  const setBooking = (patch: Partial<BookingSettings>) => setDraft((d) => ({ ...d, booking: { ...d.booking, ...patch } }));

  // A live look at what guests will see and which times they can book next Friday.
  const nextFriday = (() => {
    const d = new Date(`${todayISO()}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7 || 7));
    return d.toISOString().slice(0, 10);
  })();
  const sample = slotsFor(nextFriday, draft);

  return (
    <>
      <PageHeader title="Öffnungszeiten" description="Gilt überall: auf der Startseite, im Reservierungsformular und beim „Jetzt geöffnet“-Hinweis." />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <Card title="Woche">
            <ul className="flex flex-col divide-y divide-bone/[0.06]">
              {draft.hours.map((day, i) => (
                <li key={day.day} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="w-28 font-medium">{DAYS_DE[i]}</span>
                  <Toggle label={`${DAYS_DE[i]} geöffnet`} checked={Boolean(day.open)} onChange={(on) => setDay(i, on ? { open: "15:30" } : { open: null, close: null })} />
                  {day.open ? (
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      <Input aria-label={`${DAYS_DE[i]} ab`} type="time" value={day.open} onChange={(e) => setDay(i, { open: e.target.value })} className="!w-32" />
                      bis
                      <Input
                        aria-label={`${DAYS_DE[i]} bis`}
                        type="time"
                        value={day.close ?? ""}
                        onChange={(e) => setDay(i, { close: e.target.value || null })}
                        className="!w-32"
                      />
                      {!day.close && <span className="text-xs text-sage">offen gelassen: „ab {day.open} Uhr“</span>}
                    </span>
                  ) : (
                    <span className="text-sm text-sage">Geschlossen</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Schließtage & Ferien">
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Datum">{(id) => <Input id={id} type="date" min={todayISO()} value={newClosure.date} onChange={(e) => setNewClosure((c) => ({ ...c, date: e.target.value }))} />}</Field>
              <Field label="Grund (optional)" className="min-w-48 flex-1">
                {(id) => <Input id={id} value={newClosure.reason} placeholder="z. B. Betriebsferien" onChange={(e) => setNewClosure((c) => ({ ...c, reason: e.target.value }))} />}
              </Field>
              <Button
                variant="dark"
                disabled={!newClosure.date || draft.closures.some((c) => c.date === newClosure.date)}
                onClick={() => {
                  setDraft((d) => ({ ...d, closures: [...d.closures, newClosure].sort((a, b) => a.date.localeCompare(b.date)) }));
                  setNewClosure({ date: "", reason: "" });
                }}
              >
                <Plus size={16} weight="bold" /> Hinzufügen
              </Button>
            </div>
            {draft.closures.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-2">
                {draft.closures.map((c) => (
                  <li key={c.date} className="flex items-center justify-between gap-3 rounded-xl bg-night/60 px-4 py-2.5 text-sm">
                    <span>
                      <span className="font-medium">
                        {new Date(`${c.date}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
                      </span>
                      {c.reason && <span className="text-sage"> · {c.reason}</span>}
                      {c.date < todayISO() && <span className="text-sage"> · vorbei</span>}
                    </span>
                    <button
                      type="button"
                      aria-label="Entfernen"
                      onClick={() => setDraft((d) => ({ ...d, closures: d.closures.filter((x) => x.date !== c.date) }))}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-amber hover:bg-white"
                    >
                      <Trash size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-sage">Keine besonderen Schließtage eingetragen.</p>
            )}
          </Card>

          <Card title="Online-Reservierung">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-night/60 px-4 py-3 md:col-span-2">
                <span>
                  <span className="block font-medium">Reservierungen annehmen</span>
                  <span className="text-sm text-sage">Ausgeschaltet verschwindet das Formular von der Website.</span>
                </span>
                <Toggle label="Reservierungen annehmen" checked={draft.booking.enabled} onChange={(enabled) => setBooking({ enabled })} />
              </div>
              <Field label="Höchstens Gäste pro Online-Reservierung">
                {(id) => <Input id={id} type="number" min={1} max={60} value={draft.booking.maxGuests} onChange={(e) => setBooking({ maxGuests: Number(e.target.value) })} />}
              </Field>
              <Field label="Späteste Reservierungszeit">
                {(id) => <Input id={id} type="time" value={draft.booking.lastSeating} onChange={(e) => setBooking({ lastSeating: e.target.value })} />}
              </Field>
              <Field label="Zeiten im Abstand von">
                {(id) => (
                  <Select id={id} value={draft.booking.intervalMinutes} onChange={(e) => setBooking({ intervalMinutes: Number(e.target.value) as 15 | 30 | 60 })}>
                    <option value={15}>15 Minuten</option>
                    <option value={30}>30 Minuten</option>
                    <option value={60}>60 Minuten</option>
                  </Select>
                )}
              </Field>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-8 xl:h-fit">
          <Card title="Vorschau">
            <p className="text-sm text-sage">So steht es auf der Website:</p>
            <dl className="mt-3 space-y-2 rounded-2xl bg-night/60 p-4">
              {groupedHours(draft.hours).map((g) => {
                const line = describeGroup(g, content.de);
                return (
                  <div key={g.start} className="flex justify-between gap-4 text-sm">
                    <dt className="font-semibold uppercase tracking-wider text-sage">{line.days}</dt>
                    <dd className="font-mono">{line.text}</dd>
                  </div>
                );
              })}
            </dl>
            <p className="mt-4 text-sm">
              Gerade: <span className="font-medium">{describeStatus(openStatus(draft.hours, draft.closures), content.de)}</span>
            </p>
            <p className="mt-4 text-sm text-sage">Buchbare Zeiten am nächsten Freitag:</p>
            <p className="mt-1 font-mono text-sm">{draft.booking.enabled ? (sample.length ? sample.join(" · ") : "keine") : "Reservierung pausiert"}</p>
          </Card>
        </div>
      </div>
      <SaveBar dirty={dirty} busy={pending} onDiscard={discard} onSave={() => run(() => saveHours(draft), markSaved)} />
    </>
  );
}
