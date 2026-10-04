"use client";

import { Check, X } from "@phosphor-icons/react";
import { confirmAllPending, setAnnouncementEnabled, setBookingStatus, setBookingsEnabled } from "@/app/admin/actions";
import { Button, StatusBadge, Toggle, useAction } from "@/components/admin/ui";
import type { Booking } from "@/lib/types";

/* The two switches the bar flips most: online booking and the notice bar. */
export function QuickToggles({ bookingsOn, announcementOn, announcementText }: { bookingsOn: boolean; announcementOn: boolean; announcementText: string }) {
  const { pending, run } = useAction();
  return (
    <ul className="flex flex-col divide-y divide-bone/[0.06]">
      <li className="flex items-center justify-between gap-4 py-3 first:pt-0">
        <div>
          <p className="font-medium">Online-Reservierung</p>
          <p className="text-sm text-sage">{bookingsOn ? "Gäste können Tische anfragen." : "Pausiert, das Formular ist ausgeblendet."}</p>
        </div>
        <Toggle label="Online-Reservierung" checked={bookingsOn} disabled={pending} onChange={(next) => run(() => setBookingsEnabled(next))} />
      </li>
      <li className="flex items-center justify-between gap-4 py-3 last:pb-0">
        <div className="min-w-0">
          <p className="font-medium">Hinweis-Leiste</p>
          <p className="truncate text-sm text-sage">{announcementText || "Noch kein Text, siehe „Texte & Hinweis“."}</p>
        </div>
        <Toggle label="Hinweis-Leiste" checked={announcementOn} disabled={pending} onChange={(next) => run(() => setAnnouncementEnabled(next))} />
      </li>
    </ul>
  );
}

/* Pending requests with one-tap confirm / cancel. */
export function PendingList({ bookings }: { bookings: Booking[] }) {
  const { pending, run } = useAction();
  if (bookings.length === 0) return <p className="text-sm text-sage">Keine offenen Anfragen. Alles erledigt.</p>;
  return (
    <>
      <ul className="flex flex-col gap-2">
        {bookings.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-night/60 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {b.name} <span className="font-normal text-sage">· {b.guests} {b.guests === 1 ? "Gast" : "Gäste"}</span>
              </p>
              <p className="font-mono text-xs text-sage">
                {new Date(`${b.date}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })} · {b.time} Uhr · {b.reference}
              </p>
            </div>
            <span className="flex gap-1.5">
              <Button size="sm" variant="dark" disabled={pending} onClick={() => run(() => setBookingStatus(b.id, "confirmed"))}>
                <Check size={14} weight="bold" /> Bestätigen
              </Button>
              <Button size="sm" variant="danger" disabled={pending} onClick={() => run(() => setBookingStatus(b.id, "cancelled"))} aria-label={`${b.name} absagen`}>
                <X size={14} weight="bold" />
              </Button>
            </span>
          </li>
        ))}
      </ul>
      {bookings.length > 1 && (
        <Button className="mt-4" variant="secondary" size="sm" busy={pending} onClick={() => run(() => confirmAllPending())}>
          Alle {bookings.length} bestätigen
        </Button>
      )}
    </>
  );
}

/* Tonight at a glance: tap through confirmed → seated (or no-show). */
export function TodayList({ bookings }: { bookings: Booking[] }) {
  const { pending, run } = useAction();
  if (bookings.length === 0) return <p className="text-sm text-sage">Heute sind keine Tische reserviert.</p>;
  return (
    <ul className="flex flex-col divide-y divide-bone/[0.06]">
      {bookings.map((b) => (
        <li key={b.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span className="w-14 font-mono text-lg">{b.time}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{b.name}</span>
            <span className="text-sm text-sage">
              {b.guests} {b.guests === 1 ? "Gast" : "Gäste"}
              {b.table && ` · Tisch ${b.table}`}
            </span>
          </span>
          <StatusBadge status={b.status} />
          {b.status === "confirmed" && (
            <span className="flex gap-1.5">
              <Button size="sm" variant="dark" disabled={pending} onClick={() => run(() => setBookingStatus(b.id, "seated"))}>
                Ist da
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setBookingStatus(b.id, "no-show"))}>
                Nicht gekommen
              </Button>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
