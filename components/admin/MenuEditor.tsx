"use client";

import { useState } from "react";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { ArrowDown, ArrowUp, Copy, DotsSixVertical, Image as ImageIcon, Plus, Star, Trash } from "@phosphor-icons/react";
import { saveMenu } from "@/app/admin/actions";
import { Button, Card, ConfirmButton, Field, Input, SaveBar, Toggle, useAction, useDraft } from "@/components/admin/ui";
import type { Drink, MenuCategory } from "@/lib/types";

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const move = <T,>(list: T[], from: number, to: number) => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const formatPrice = (value: string) => {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : value;
};

function DrinkRow({
  drink,
  index,
  total,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: {
  drink: Drink;
  index: number;
  total: number;
  onChange: (patch: Partial<Drink>) => void;
  onMove: (to: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Reorder.Item value={drink} id={drink.id} className="list-none rounded-2xl bg-white ring-1 ring-bone/[0.06]">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <span className="hidden cursor-grab touch-none text-sage active:cursor-grabbing md:block" aria-hidden="true">
          <DotsSixVertical size={18} weight="bold" />
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-night"
          aria-label={`Foto von ${drink.name || "Getränk"} bearbeiten`}
        >
          {drink.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={drink.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={18} className="m-auto text-sage" />
          )}
        </button>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 md:grid-cols-[2fr_1fr_1fr]">
          <Input aria-label="Name" value={drink.name} placeholder="Name" onChange={(e) => onChange({ name: e.target.value })} className={drink.soldOut ? "line-through" : ""} />
          <Input aria-label="Menge" value={drink.size} placeholder="0,5 l" onChange={(e) => onChange({ size: e.target.value })} />
          <Input aria-label="Preis in Euro" value={drink.price} inputMode="decimal" placeholder="4.00" onChange={(e) => onChange({ price: e.target.value })} />
        </div>
        <span className="hidden w-20 text-right font-mono text-sm text-sage lg:block">{formatPrice(drink.price)}</span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange({ featured: !drink.featured })}
            aria-pressed={drink.featured}
            title="Tipp des Hauses"
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${drink.featured ? "bg-route text-chrome" : "text-sage hover:bg-night"}`}
          >
            <Star size={16} weight={drink.featured ? "fill" : "regular"} />
            <span className="sr-only">Tipp des Hauses</span>
          </button>
          <label className="flex items-center gap-2 pl-1 text-xs text-sage">
            <Toggle label={`${drink.name} ausverkauft`} checked={drink.soldOut} onChange={(soldOut) => onChange({ soldOut })} />
            <span className="hidden xl:inline">Aus</span>
          </label>
          <button type="button" onClick={() => setOpen((v) => !v)} className="ml-1 rounded-full px-3 py-2 text-xs font-medium text-route hover:bg-night">
            {open ? "Weniger" : "Mehr"}
          </button>
        </span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-1 gap-3 border-t border-bone/[0.06] p-4 md:grid-cols-2">
              <Field label="Beschreibung (Deutsch)">{(id) => <Input id={id} value={drink.notes} onChange={(e) => onChange({ notes: e.target.value })} />}</Field>
              <Field label="Beschreibung (Englisch)" hint="Leer lassen, dann erscheint auch auf Englisch der deutsche Text.">
                {(id) => <Input id={id} value={drink.notesEn} onChange={(e) => onChange({ notesEn: e.target.value })} />}
              </Field>
              <Field label="Foto-Link" className="md:col-span-2" hint="Ein https://-Link zu einem Foto, z. B. von Unsplash.">
                {(id) => <Input id={id} value={drink.image} placeholder="https://…" onChange={(e) => onChange({ image: e.target.value })} />}
              </Field>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => onMove(index - 1)}>
                  <ArrowUp size={14} /> Nach oben
                </Button>
                <Button size="sm" variant="ghost" disabled={index === total - 1} onClick={() => onMove(index + 1)}>
                  <ArrowDown size={14} /> Nach unten
                </Button>
                <Button size="sm" variant="ghost" onClick={onDuplicate}>
                  <Copy size={14} /> Duplizieren
                </Button>
                <ConfirmButton prompt="Entfernen?" onConfirm={onDelete}>
                  <Trash size={14} /> Entfernen
                </ConfirmButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

export default function MenuEditor({ menu }: { menu: MenuCategory[] }) {
  const { draft, setDraft, dirty, discard, markSaved } = useDraft(menu);
  const [activeId, setActiveId] = useState(menu[0]?.id);
  const { pending, run } = useAction();
  const index = Math.max(0, draft.findIndex((c) => c.id === activeId));
  const category = draft[index];

  const updateCategory = (patch: Partial<MenuCategory>) => setDraft((all) => all.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  const updateDrinks = (drinks: Drink[]) => updateCategory({ drinks });
  const updateDrink = (drinkIndex: number, patch: Partial<Drink>) =>
    updateDrinks(category.drinks.map((d, i) => (i === drinkIndex ? { ...d, ...patch } : d)));

  const addCategory = () => {
    const id = uid("kategorie");
    setDraft((all) => [...all, { id, label: "Neue Kategorie", sub: "New category", drinks: [] }]);
    setActiveId(id);
  };

  const totalDrinks = draft.reduce((n, c) => n + c.drinks.length, 0);
  const soldOut = draft.reduce((n, c) => n + c.drinks.filter((d) => d.soldOut).length, 0);

  return (
    <>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="display text-4xl md:text-5xl">Getränkekarte</h1>
          <p className="mt-2 max-w-[60ch] text-sage">
            {draft.length} Kategorien, {totalDrinks} Getränke{soldOut ? `, ${soldOut} ausverkauft` : ""}. Änderungen sind nach dem Speichern sofort auf der Website.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit !p-3">
          <ul className="flex flex-col gap-1">
            {draft.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    i === index ? "bg-asphalt text-chrome" : "hover:bg-night"
                  }`}
                >
                  <span className="truncate font-medium">{c.label || "Ohne Namen"}</span>
                  <span className={i === index ? "text-chrome/60" : "text-sage"}>{c.drinks.length}</span>
                </button>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={addCategory}>
            <Plus size={14} weight="bold" /> Kategorie
          </Button>
        </Card>

        {category && (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Überschrift (Deutsch)">{(id) => <Input id={id} value={category.label} onChange={(e) => updateCategory({ label: e.target.value })} />}</Field>
                <Field label="Überschrift (Englisch)" hint="Steht auf der Website klein darunter, wie auf der gedruckten Karte.">
                  {(id) => <Input id={id} value={category.sub} onChange={(e) => updateCategory({ sub: e.target.value })} />}
                </Field>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => setDraft((all) => move(all, index, index - 1))}>
                  <ArrowUp size={14} /> Weiter nach vorn
                </Button>
                <Button size="sm" variant="ghost" disabled={index === draft.length - 1} onClick={() => setDraft((all) => move(all, index, index + 1))}>
                  <ArrowDown size={14} /> Weiter nach hinten
                </Button>
                {draft.length > 1 && (
                  <ConfirmButton
                    prompt={category.drinks.length ? `Mit ${category.drinks.length} Getränken löschen?` : "Löschen?"}
                    onConfirm={() => {
                      setDraft((all) => all.filter((_, i) => i !== index));
                      setActiveId(draft[index === 0 ? 1 : 0]?.id);
                    }}
                  >
                    <Trash size={14} /> Kategorie löschen
                  </ConfirmButton>
                )}
              </div>
            </Card>

            <Reorder.Group axis="y" values={category.drinks} onReorder={updateDrinks} className="flex flex-col gap-2">
              {category.drinks.map((drink, i) => (
                <DrinkRow
                  key={drink.id}
                  drink={drink}
                  index={i}
                  total={category.drinks.length}
                  onChange={(patch) => updateDrink(i, patch)}
                  onMove={(to) => updateDrinks(move(category.drinks, i, to))}
                  onDuplicate={() => {
                    const copy = { ...drink, id: uid(category.id), name: `${drink.name} (Kopie)` };
                    updateDrinks([...category.drinks.slice(0, i + 1), copy, ...category.drinks.slice(i + 1)]);
                  }}
                  onDelete={() => updateDrinks(category.drinks.filter((_, j) => j !== i))}
                />
              ))}
            </Reorder.Group>
            {category.drinks.length === 0 && <p className="rounded-2xl border border-dashed border-bone/20 p-6 text-center text-sm text-sage">Noch keine Getränke in dieser Kategorie.</p>}

            <Button
              variant="secondary"
              className="w-fit"
              onClick={() =>
                updateDrinks([
                  ...category.drinks,
                  { id: uid(category.id), name: "", notes: "", notesEn: "", size: "", price: "0.00", image: "", soldOut: false, featured: false },
                ])
              }
            >
              <Plus size={16} weight="bold" /> Getränk hinzufügen
            </Button>
          </div>
        )}
      </div>

      <SaveBar dirty={dirty} busy={pending} onDiscard={discard} onSave={() => run(() => saveMenu(draft), markSaved)} />
    </>
  );
}
