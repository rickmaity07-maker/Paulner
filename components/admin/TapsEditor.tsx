"use client";

import { ArrowDown, ArrowUp, Plus, Trash } from "@phosphor-icons/react";
import { saveTaps } from "@/app/admin/actions";
import { Button, Card, ConfirmButton, Field, Input, PageHeader, SaveBar, Textarea, useAction, useDraft } from "@/components/admin/ui";
import type { Tap } from "@/lib/types";

const move = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/* The sideways-scrolling "Vom Fass" section: up to eight beers with photo and blurb. */
export default function TapsEditor({ taps }: { taps: Tap[] }) {
  const { draft, setDraft, dirty, discard, markSaved } = useDraft(taps);
  const { pending, run } = useAction();
  const update = (i: number, patch: Partial<Tap>) => setDraft((all) => all.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  return (
    <>
      <PageHeader title="Vom Fass" description="Die Biere im seitlich scrollenden Abschnitt der Startseite. Reihenfolge wie hier." />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {draft.map((tap, i) => (
          <Card key={tap.id}>
            <div className="flex gap-4">
              <div className="h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-night ring-4 ring-bone/80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {tap.image && <img src={tap.image} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Name">{(id) => <Input id={id} value={tap.name} onChange={(e) => update(i, { name: e.target.value })} />}</Field>
                <Field label="Menge & Preis">{(id) => <Input id={id} value={tap.pour} placeholder="0,5 l · 4,00 €" onChange={(e) => update(i, { pour: e.target.value })} />}</Field>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Beschreibung (Deutsch)">{(id) => <Textarea id={id} rows={3} value={tap.body} onChange={(e) => update(i, { body: e.target.value })} />}</Field>
              <Field label="Beschreibung (Englisch)">{(id) => <Textarea id={id} rows={3} value={tap.bodyEn ?? ""} onChange={(e) => update(i, { bodyEn: e.target.value })} />}</Field>
              <Field label="Foto-Link" className="md:col-span-2">{(id) => <Input id={id} value={tap.image} placeholder="https://…" onChange={(e) => update(i, { image: e.target.value })} />}</Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => setDraft((all) => move(all, i, i - 1))}>
                <ArrowUp size={14} /> Früher
              </Button>
              <Button size="sm" variant="ghost" disabled={i === draft.length - 1} onClick={() => setDraft((all) => move(all, i, i + 1))}>
                <ArrowDown size={14} /> Später
              </Button>
              <ConfirmButton prompt="Entfernen?" onConfirm={() => setDraft((all) => all.filter((_, j) => j !== i))}>
                <Trash size={14} /> Entfernen
              </ConfirmButton>
            </div>
          </Card>
        ))}
      </div>
      {draft.length < 8 && (
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => setDraft((all) => [...all, { id: `fass-${Math.random().toString(36).slice(2, 8)}`, name: "", pour: "", body: "", bodyEn: "", image: "" }])}
        >
          <Plus size={16} weight="bold" /> Bier hinzufügen
        </Button>
      )}
      <SaveBar dirty={dirty} busy={pending} onDiscard={discard} onSave={() => run(() => saveTaps(draft), markSaved)} />
    </>
  );
}
