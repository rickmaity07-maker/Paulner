"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Confetti, Megaphone, Plus, Trash, Warning, X } from "@phosphor-icons/react";
import { saveContent } from "@/app/admin/actions";
import { Button, Card, ConfirmButton, Field, Input, PageHeader, SaveBar, Textarea, Toggle, useAction, useDraft } from "@/components/admin/ui";
import type { Announcement, AnnouncementTone, Hero, InfoRow } from "@/lib/types";

interface Draft {
  hero: Hero;
  announcement: Announcement;
  info: InfoRow[];
  marquee: string[];
}

const TONES: { id: AnnouncementTone; label: string; className: string; Icon: typeof Megaphone }[] = [
  { id: "info", label: "Info", className: "bg-route text-chrome", Icon: Megaphone },
  { id: "event", label: "Veranstaltung", className: "bg-amber text-chrome", Icon: Confetti },
  { id: "warning", label: "Wichtig", className: "bg-gold text-asphalt", Icon: Warning },
];

const move = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/* Two fields side by side: German left (required on the site), English right (falls back to German). */
function Pair({ label, de, en, onDe, onEn, area, rows = 2 }: { label: string; de: string; en: string; onDe: (v: string) => void; onEn: (v: string) => void; area?: boolean; rows?: number }) {
  const Control = area ? Textarea : Input;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Field label={`${label} · Deutsch`}>{(id) => <Control id={id} rows={rows} value={de} onChange={(e) => onDe(e.target.value)} />}</Field>
      <Field label={`${label} · Englisch`}>{(id) => <Control id={id} rows={rows} value={en ?? ""} onChange={(e) => onEn(e.target.value)} />}</Field>
    </div>
  );
}

export default function ContentEditor(initial: Draft) {
  const { draft, setDraft, dirty, discard, markSaved } = useDraft<Draft>(initial);
  const { pending, run } = useAction();
  const [ticker, setTicker] = useState("");
  const hero = (patch: Partial<Hero>) => setDraft((d) => ({ ...d, hero: { ...d.hero, ...patch } }));
  const note = (patch: Partial<Announcement>) => setDraft((d) => ({ ...d, announcement: { ...d.announcement, ...patch } }));
  const row = (i: number, patch: Partial<InfoRow>) => setDraft((d) => ({ ...d, info: d.info.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const tone = TONES.find((t) => t.id === draft.announcement.tone) ?? TONES[0];

  return (
    <>
      <PageHeader title="Texte & Hinweis" description="Alles, was Gäste auf der Startseite lesen. Jeder Text auf Deutsch und Englisch; ein leeres englisches Feld zeigt den deutschen Text." />

      <div className="flex flex-col gap-4">
        <Card title="Hinweis-Leiste" action={<Toggle label="Hinweis anzeigen" checked={draft.announcement.enabled} onChange={(enabled) => note({ enabled })} />}>
          <div className={`mb-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${tone.className} ${draft.announcement.enabled ? "" : "opacity-40"}`}>
            <tone.Icon size={18} weight="fill" />
            <span className="flex-1">{draft.announcement.text || "Vorschau: hier steht euer Hinweis."}</span>
            <X size={14} />
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={draft.announcement.tone === t.id}
                onClick={() => note({ tone: t.id })}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 transition-colors ${
                  draft.announcement.tone === t.id ? "bg-asphalt text-chrome ring-asphalt" : "ring-bone/15 hover:bg-night"
                }`}
              >
                <t.Icon size={14} /> {t.label}
              </button>
            ))}
          </div>
          <Pair label="Text" de={draft.announcement.text} en={draft.announcement.textEn} onDe={(text) => note({ text })} onEn={(textEn) => note({ textEn })} />
        </Card>

        <Card title="Begrüßung oben">
          <div className="flex flex-col gap-4">
            <Pair label="Begrüßungstext" area de={draft.hero.tagline} en={draft.hero.taglineEn} onDe={(tagline) => hero({ tagline })} onEn={(taglineEn) => hero({ taglineEn })} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Wort auf der beschlagenen Scheibe oben" hint="Kurz halten, höchstens 16 Zeichen.">
                {(id) => <Input id={id} maxLength={16} value={draft.hero.fogWord} onChange={(e) => hero({ fogWord: e.target.value })} />}
              </Field>
              <Field label="Wort auf der Scheibe ganz unten">{(id) => <Input id={id} maxLength={16} value={draft.hero.footerWord} onChange={(e) => hero({ footerWord: e.target.value })} />}</Field>
            </div>
            <Pair label="Schlusssatz unten" de={draft.hero.footerLine} en={draft.hero.footerLineEn} onDe={(footerLine) => hero({ footerLine })} onEn={(footerLineEn) => hero({ footerLineEn })} />
          </div>
        </Card>

        <Card title="„Gut zu wissen“">
          <div className="flex flex-col gap-4">
            {draft.info.map((r, i) => (
              <div key={r.id} className="rounded-2xl bg-night/50 p-4">
                <div className="flex flex-col gap-3">
                  <Pair label="Bezeichnung" de={r.label} en={r.labelEn} onDe={(label) => row(i, { label })} onEn={(labelEn) => row(i, { labelEn })} />
                  <Pair label="Überschrift" de={r.title} en={r.titleEn} onDe={(title) => row(i, { title })} onEn={(titleEn) => row(i, { titleEn })} />
                  <Pair label="Text" area de={r.body} en={r.bodyEn} onDe={(body) => row(i, { body })} onEn={(bodyEn) => row(i, { bodyEn })} />
                  <Pair label="Kurzinfo rechts" de={r.meta} en={r.metaEn} onDe={(meta) => row(i, { meta })} onEn={(metaEn) => row(i, { metaEn })} />
                  <Field label="Foto-Link">{(id) => <Input id={id} value={r.image} onChange={(e) => row(i, { image: e.target.value })} />}</Field>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => setDraft((d) => ({ ...d, info: move(d.info, i, i - 1) }))}>
                    <ArrowUp size={14} /> Hoch
                  </Button>
                  <Button size="sm" variant="ghost" disabled={i === draft.info.length - 1} onClick={() => setDraft((d) => ({ ...d, info: move(d.info, i, i + 1) }))}>
                    <ArrowDown size={14} /> Runter
                  </Button>
                  <ConfirmButton prompt="Entfernen?" onConfirm={() => setDraft((d) => ({ ...d, info: d.info.filter((_, j) => j !== i) }))}>
                    <Trash size={14} /> Entfernen
                  </ConfirmButton>
                </div>
              </div>
            ))}
            {draft.info.length < 8 && (
              <Button
                variant="secondary"
                className="w-fit"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    info: [
                      ...d.info,
                      { id: `info-${Math.random().toString(36).slice(2, 8)}`, label: "", labelEn: "", title: "", titleEn: "", body: "", bodyEn: "", meta: "", metaEn: "", image: "" },
                    ],
                  }))
                }
              >
                <Plus size={16} weight="bold" /> Zeile hinzufügen
              </Button>
            )}
          </div>
        </Card>

        <Card title="Laufband">
          <ul className="flex flex-wrap gap-2">
            {draft.marquee.map((item, i) => (
              <li key={`${item}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-amber py-1.5 pl-4 pr-1.5 text-sm text-chrome">
                {item}
                <button
                  type="button"
                  aria-label={`${item} entfernen`}
                  onClick={() => setDraft((d) => ({ ...d, marquee: d.marquee.filter((_, j) => j !== i) }))}
                  className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/15"
                >
                  <X size={12} weight="bold" />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!ticker.trim()) return;
              setDraft((d) => ({ ...d, marquee: [...d.marquee, ticker.trim()] }));
              setTicker("");
            }}
          >
            <Input aria-label="Neuer Eintrag" value={ticker} maxLength={30} placeholder="z. B. Weißbier" onChange={(e) => setTicker(e.target.value)} className="max-w-xs" />
            <Button type="submit" variant="dark">
              <Plus size={16} weight="bold" />
            </Button>
          </form>
        </Card>
      </div>

      <SaveBar dirty={dirty} busy={pending} onDiscard={discard} onSave={() => run(() => saveContent(draft), markSaved)} />
    </>
  );
}
