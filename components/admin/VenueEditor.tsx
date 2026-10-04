"use client";

import { useRef, useState } from "react";
import { CheckCircle, DownloadSimple, EnvelopeSimple, UploadSimple, WarningCircle } from "@phosphor-icons/react";
import { resetContent, restoreBackup, saveVenue, sendTestEmail } from "@/app/admin/actions";
import { Button, Card, Field, Input, PageHeader, SaveBar, useAction, useDraft } from "@/components/admin/ui";
import type { Venue } from "@/lib/types";

interface Props {
  venue: Venue;
  setup: { mail: boolean; google: boolean; cron: boolean };
}

function SetupRow({ ok, title, body }: { ok: boolean; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      {ok ? <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-emerald-700" /> : <WarningCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-gold" />}
      <span>
        <span className="block font-medium">
          {title} <span className="font-normal text-sage">· {ok ? "eingerichtet" : "noch nicht eingerichtet"}</span>
        </span>
        <span className="text-sm text-sage">{body}</span>
      </span>
    </li>
  );
}

export default function VenueEditor({ venue, setup }: Props) {
  const { draft, setDraft, dirty, discard, markSaved } = useDraft(venue);
  const { pending, run } = useAction();
  const [confirm, setConfirm] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const set = (key: keyof Venue) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((v) => ({ ...v, [key]: key === "reviews" ? Number(e.target.value) : e.target.value }));

  return (
    <>
      <PageHeader title="Bar & Sicherung" description="Adresse, Kontakt und Bewertung erscheinen auf der Startseite, im Impressum und in den E-Mails." />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <Card title="Angaben zur Bar">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Name der Bar">{(id) => <Input id={id} value={draft.name} onChange={set("name")} />}</Field>
              <Field label="Verantwortliche Person" hint="Pflichtangabe im Impressum (Inhaber oder Geschäftsführung).">
                {(id) => <Input id={id} value={draft.contactName} onChange={set("contactName")} />}
              </Field>
              <Field label="Straße und Hausnummer">{(id) => <Input id={id} value={draft.street} onChange={set("street")} />}</Field>
              <Field label="PLZ und Ort">{(id) => <Input id={id} value={draft.city} onChange={set("city")} />}</Field>
              <Field label="Telefon" hint="Erscheint auf der Website, sobald eingetragen.">{(id) => <Input id={id} type="tel" value={draft.phone} onChange={set("phone")} />}</Field>
              <Field label="E-Mail" hint="Für Impressum und Kontakt.">{(id) => <Input id={id} type="email" value={draft.email} onChange={set("email")} />}</Field>
              <Field label="Instagram-Link">{(id) => <Input id={id} value={draft.instagram} placeholder="https://instagram.com/…" onChange={set("instagram")} />}</Field>
              <Field label="Plus Code">{(id) => <Input id={id} value={draft.plusCode} onChange={set("plusCode")} />}</Field>
              <Field label="Google-Maps-Link" className="md:col-span-2">{(id) => <Input id={id} value={draft.maps} onChange={set("maps")} />}</Field>
              <Field label="Google-Bewertung" hint="z. B. 4.5">{(id) => <Input id={id} value={draft.rating} onChange={set("rating")} />}</Field>
              <Field label="Anzahl Bewertungen">{(id) => <Input id={id} type="number" min={0} value={draft.reviews} onChange={set("reviews")} />}</Field>
              <Field label="Preisspanne pro Person">{(id) => <Input id={id} value={draft.priceBand} onChange={set("priceBand")} />}</Field>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Einrichtung">
            <ul className="flex flex-col gap-4">
              <SetupRow ok={true} title="Datenbank (Neon)" body="Projekt „paulaner“, Frankfurt. Reservierungen, Konten und Inhalte liegen hier." />
              <SetupRow ok={setup.mail} title="E-Mails bei Reservierungen" body="Bestätigung, Änderung und Stornierung gehen automatisch an Gäste; neue Anfragen an euch. Gmail-Zugang in GMAIL_USER, GMAIL_APP_PASSWORD und RESERVATION_NOTIFY_EMAIL." />
              <SetupRow ok={setup.google} title="Mit Google anmelden" body="GOOGLE_CLIENT_ID und GOOGLE_CLIENT_SECRET aus der Google Cloud Console." />
              <SetupRow ok={setup.cron} title="Automatische Löschfristen" body="CRON_SECRET für die tägliche Bereinigung alter Daten (DSGVO)." />
            </ul>
            {setup.mail && (
              <Button className="mt-5" variant="secondary" size="sm" busy={pending} onClick={() => run(() => sendTestEmail())}>
                <EnvelopeSimple size={15} /> Test-E-Mail senden
              </Button>
            )}
          </Card>

          <Card title="Sicherung">
            <p className="text-sm text-sage">Karte, Zeiten und Texte als Datei. Reservierungen gibt es als Excel-Export unter „Reservierungen“.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/admin/export?type=backup" className="inline-flex h-11 items-center gap-2 rounded-full bg-asphalt px-5 text-sm font-medium text-chrome hover:bg-black">
                <DownloadSimple size={16} /> Herunterladen
              </a>
              <Button variant="secondary" busy={pending} onClick={() => file.current?.click()}>
                <UploadSimple size={16} /> Einspielen
              </Button>
              <input
                ref={file}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={async (e) => {
                  const chosen = e.target.files?.[0];
                  e.target.value = "";
                  if (!chosen) return;
                  const text = await chosen.text();
                  if (window.confirm("Karte, Zeiten und Texte durch diese Sicherung ersetzen?")) run(() => restoreBackup(text));
                }}
              />
            </div>
          </Card>

          <Card title="Auf Anfang zurücksetzen">
            <p className="text-sm text-sage">Stellt Karte und Texte wie beim Start wieder her (Preise von der gedruckten Karte). Reservierungen und Konten bleiben.</p>
            <div className="mt-4 flex gap-2">
              <Input aria-label="Zum Bestätigen ZURÜCKSETZEN eingeben" placeholder="ZURÜCKSETZEN" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              <Button variant="danger" disabled={confirm !== "ZURÜCKSETZEN"} busy={pending} onClick={() => run(() => resetContent(confirm), () => setConfirm(""))}>
                Zurücksetzen
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <SaveBar dirty={dirty} busy={pending} onDiscard={discard} onSave={() => run(() => saveVenue(draft), markSaved)} />
    </>
  );
}
