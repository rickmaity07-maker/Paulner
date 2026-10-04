"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus } from "@phosphor-icons/react";
import Reveal from "@/components/Reveal";
import { useLanguage } from "@/lib/language";
import { pick, type InfoRow } from "@/lib/types";

/*
  Good-to-know facts as stacked rows. The row under the pointer (or the one tapped, or
  focused) opens downward to show its photo and description; the others stay
  as a single line with the label, the headline and a short fact.
*/
export default function Info({ info }: { info: InfoRow[] }) {
  const [active, setActive] = useState(0);
  const { locale, t } = useLanguage();

  return (
    <section id="info" className="scroll-mt-8 px-4 py-24 md:px-10 md:py-36">
      <Reveal>
        <h2 className="display max-w-[16ch] text-[clamp(2.6rem,5.4vw,5.4rem)] leading-[1.02] text-bone">
          {t.info.title} <em>{t.info.titleEm}</em>
        </h2>
      </Reveal>

      <ul className="mt-12 border-t border-bone/15 md:mt-20">
        {info.map((row, index) => {
          const open = index === active;
          return (
            <li key={row.id} className="border-b border-bone/15" onPointerEnter={(e) => e.pointerType === "mouse" && setActive(index)}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`info-${index}`}
                onClick={() => setActive(index)}
                onFocus={() => setActive(index)}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-4 py-6 text-left md:grid-cols-12 md:gap-8 md:py-8"
              >
                <span
                  className={`display text-4xl transition-colors duration-500 ease-leaf md:col-span-5 md:text-6xl ${
                    open ? "text-bone" : "text-bone/35"
                  }`}
                >
                  {pick(locale, row.label, row.labelEn)}
                </span>
                <span
                  className={`display hidden text-3xl transition-colors duration-500 ease-leaf md:col-span-4 md:block md:text-4xl ${
                    open ? "text-amber" : "text-bone/35"
                  }`}
                >
                  {pick(locale, row.title, row.titleEn)}
                </span>
                <span className="flex items-center justify-end gap-4 md:col-span-3">
                  <span className="hidden font-mono text-sm text-sage sm:inline">{pick(locale, row.meta, row.metaEn)}</span>
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-bone/20 transition-transform duration-500 ease-leaf ${
                      open ? "rotate-45 bg-amber text-chrome ring-amber" : "text-bone"
                    }`}
                  >
                    <Plus size={18} weight="bold" />
                  </span>
                </span>
              </button>

              <div
                id={`info-${index}`}
                className={`grid transition-[grid-template-rows,opacity] duration-700 ease-leaf ${
                  open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="grid grid-cols-1 gap-6 pb-8 md:grid-cols-12 md:gap-8 md:pb-10">
                    <div className="md:col-span-5 md:col-start-6 md:row-start-1">
                      <p className="display text-3xl text-amber md:hidden">{pick(locale, row.title, row.titleEn)}</p>
                      <p className="mt-2 max-w-[40ch] text-lg leading-relaxed text-bone/85 md:mt-0">{pick(locale, row.body, row.bodyEn)}</p>
                      <p className="mt-3 font-mono text-sm text-sage sm:hidden">{pick(locale, row.meta, row.metaEn)}</p>
                    </div>
                    <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] bg-fern md:col-span-4 md:row-start-1 md:aspect-[4/3]">
                      <Image
                        src={row.image}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 30vw, 100vw"
                        className={`object-cover transition-transform duration-1000 ease-leaf ${open ? "scale-100" : "scale-110"}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
