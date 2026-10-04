"use client";

import { useState, type PointerEvent } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import Reveal from "@/components/Reveal";
import { Star4 } from "@/components/Sparkles";
import { useLanguage } from "@/lib/language";
import { pick, type MenuCategory } from "@/lib/types";

/*
  The drinks card across the full width. Category tabs are set large like the
  menu's headings, with the English name underneath; each drink is a row with
  the name, a note, the pour and the price in their own columns. On desktop the drink's photo follows the pointer on a spring; on
  touch screens each row carries a small thumbnail instead.
*/
/* Prices are stored as "3.50"; Germans read "3,50 €", English readers "€3.50". */
const price = (value: string, locale: string) =>
  new Intl.NumberFormat(locale === "en" ? "en-GB" : "de-DE", { style: "currency", currency: "EUR" }).format(Number(value));

export default function Drinks({ menu }: { menu: MenuCategory[] }) {
  const { locale, t } = useLanguage();
  const [tab, setTab] = useState(menu[0]?.id);
  const [hovered, setHovered] = useState<string | null>(null);
  const category = menu.find((entry) => entry.id === tab) ?? menu[0];
  const active = category?.drinks.find((drink) => drink.id === hovered);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 28, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 260, damping: 28, mass: 0.6 });

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  };

  if (!category) return null;

  return (
    <section id="drinks" className="scroll-mt-8 px-4 py-24 md:px-10 md:py-36">
      <Reveal>
        <div className="mb-12 flex items-end justify-between gap-6 md:mb-16">
          <h2 className="display text-[clamp(2.6rem,5.4vw,5.4rem)] leading-[1.02] text-amber">
            {t.drinks.title} <em className="block text-[0.42em] tracking-[0.08em]">{t.drinks.sub}</em>
          </h2>
          <Star4 size={56} color="#b3203a" className="hidden shrink-0 animate-twinkle md:block motion-reduce:animate-none" />
        </div>
      </Reveal>
      <Reveal>
        <div
          role="tablist"
          aria-label={t.drinks.sections}
          className="flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b border-bone/15 pb-6 md:gap-x-12"
        >
          {menu.map((entry) => {
            const selected = entry.id === tab;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`tab-${entry.id}`}
                aria-selected={selected}
                aria-controls="drinks-panel"
                onClick={() => setTab(entry.id)}
                className={`relative flex flex-col items-start text-left transition-colors duration-500 ease-leaf ${
                  selected ? "text-bone" : "text-bone/30 hover:text-bone/60"
                }`}
              >
                <span className="display text-[clamp(1.8rem,3.8vw,3.6rem)] leading-none">{locale === "en" && entry.sub ? entry.sub : entry.label}</span>
                <span className={`label mt-2 ${selected ? "text-route" : ""}`}>{locale === "en" && entry.sub ? entry.label : entry.sub}</span>
                {selected && (
                  <motion.span
                    layoutId="tab-underline"
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    className="absolute -bottom-[25px] left-0 right-0 h-[3px] rounded-full bg-amber"
                  />
                )}
              </button>
            );
          })}
        </div>
      </Reveal>

      <div className="relative" onPointerMove={handleMove} onPointerLeave={() => setHovered(null)}>
        <AnimatePresence mode="wait">
          <motion.ul
            key={tab}
            id="drinks-panel"
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="divide-y divide-bone/10"
          >
            {category.drinks.map((drink, index) => (
              <motion.li
                key={drink.id}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(drink.id)}
                className="group grid grid-cols-[56px_1fr_auto] items-center gap-4 py-6 md:grid-cols-12 md:gap-8 md:py-7"
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-fern md:hidden">
                  <Image src={drink.image} alt="" fill sizes="56px" className="object-cover" />
                </div>
                <div className="min-w-0 md:col-span-6">
                  <h3
                    className={`display flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl transition-[color,transform] duration-500 ease-leaf group-hover:translate-x-3 group-hover:text-amber md:text-4xl ${
                      drink.soldOut ? "text-bone/40 line-through decoration-amber decoration-2" : "text-bone"
                    }`}
                  >
                    {drink.name}
                    {drink.featured && (
                      <span className="label inline-flex items-center gap-1 rounded-full bg-route px-2.5 py-1 text-[10px] text-chrome no-underline">
                        <Star4 size={10} color="#f6efe6" /> {t.drinks.pick}
                      </span>
                    )}
                    {drink.soldOut && (
                      <span className="label rounded-full bg-amber px-2.5 py-1 text-[10px] text-chrome">{t.drinks.soldOut}</span>
                    )}
                  </h3>
                  <p className="mt-1 text-sm text-sage md:hidden">{pick(locale, drink.notes, drink.notesEn)}</p>
                </div>
                <p className="hidden text-base leading-relaxed text-sage md:col-span-4 md:block">{pick(locale, drink.notes, drink.notesEn)}</p>
                <p className="text-right font-mono text-base text-bone md:col-span-2 md:text-lg">
                  <span className="block text-xs text-sage md:inline md:pr-3 md:text-sm">{drink.size}</span>
                  {price(drink.price, locale)}
                </p>
              </motion.li>
            ))}
          </motion.ul>
        </AnimatePresence>

        {/* Floating photo, desktop pointers only. Pointer-transparent so rows keep their hover. */}
        <motion.div
          aria-hidden="true"
          style={{ x: springX, y: springY }}
          className="pointer-events-none absolute left-0 top-0 z-10 hidden md:block"
        >
          <AnimatePresence>
            {active && (
              <motion.div
                key={active.name}
                initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: 3 }}
                exit={{ opacity: 0, scale: 0.9, rotate: 6 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="absolute -left-28 -top-36 h-72 w-56 overflow-hidden rounded-[1.75rem] bg-fern shadow-[0_30px_60px_-20px_rgba(4,8,6,0.8)] ring-1 ring-bone/15"
              >
                <Image src={active.image} alt="" fill sizes="224px" className="object-cover" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <p className="mt-8 max-w-[60ch] text-sm text-sage">
        {t.drinks.note}
      </p>
    </section>
  );
}
