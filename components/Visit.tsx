"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight, Check, MapPin, X } from "@phosphor-icons/react";
import { PHOTOS } from "@/lib/data";
import { describeGroup, groupedHours } from "@/lib/hours";
import { useLanguage } from "@/lib/language";
import type { Closure, DayHours, Venue } from "@/lib/types";

const prettyDate = (date: string, locale: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString(locale === "en" ? "en-GB" : "de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

/*
  The terrace, full bleed, drifting slowly as you scroll past. A card on top,
  framed like the printed menu, carries everything needed to get here:
  address, hours, what to expect. On phones the card drops below the photo.
*/
export default function Visit({ venue, hours, closures, today }: { venue: Venue; hours: DayHours[]; closures: Closure[]; today: string }) {
  const root = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: root, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const upcoming = closures.filter((c) => c.date >= today).slice(0, 3);
  const { locale, t } = useLanguage();

  return (
    <section ref={root} id="visit" className="relative scroll-mt-0 md:min-h-[100dvh]">
      <div className="relative h-[60vh] overflow-hidden md:absolute md:inset-0 md:h-auto">
        <motion.div style={{ y }} className="absolute -inset-y-[10%] inset-x-0">
          <Image src={PHOTOS.terrace} alt={t.visit.alt} fill sizes="100vw" className="object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-linear-to-r from-asphalt/60 via-asphalt/10 to-transparent" />
      </div>

      <div className="relative px-4 py-10 md:flex md:min-h-[100dvh] md:items-center md:px-10 md:py-24">
        <motion.div
          initial={{ opacity: 0, x: -40, rotate: -2 }}
          whileInView={{ opacity: 1, x: 0, rotate: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="menu-frame paper w-full max-w-lg rounded-[1.75rem] bg-night shadow-[0_40px_80px_-30px_rgba(23,20,21,0.7)]"
        >
          <div className="p-8 md:p-10">
            <p className="label text-route">{t.visit.eyebrow}</p>
            <h2 className="display mt-2 text-[clamp(2.4rem,4vw,3.6rem)] leading-[1.02] text-amber">
              {t.visit.title} <em>{t.visit.titleEm}</em>
            </h2>

            <a href={venue.maps} target="_blank" rel="noopener noreferrer" className="group mt-7 flex items-start gap-3 text-bone">
              <MapPin size={22} weight="fill" className="mt-0.5 shrink-0 text-amber" />
              <span>
                <span className="block text-lg font-medium">{venue.street}</span>
                <span className="block text-sage">
                  {venue.city} · {venue.plusCode.split(" ")[0]}
                </span>
              </span>
              <ArrowUpRight
                size={18}
                className="ml-auto mt-1 shrink-0 transition-transform duration-500 ease-leaf group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>

            <dl className="mt-7 space-y-2.5 border-t border-bone/15 pt-6">
              {groupedHours(hours).map((group) => {
                const slot = describeGroup(group, t);
                return (
                  <div key={group.start} className="flex items-baseline justify-between gap-4">
                    <dt className="label text-sage">{slot.days}</dt>
                    <dd className={`font-mono text-base ${slot.closed ? "text-sage" : "text-bone"}`}>{slot.text}</dd>
                  </div>
                );
              })}
              {upcoming.map((closure) => (
                <div key={closure.date} className="flex items-baseline justify-between gap-4 text-amber">
                  <dt className="label">{prettyDate(closure.date, locale)}</dt>
                  <dd className="font-mono text-sm">{t.visit.closedOn(closure.reason)}</dd>
                </div>
              ))}
            </dl>

            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-bone/15 pt-6 text-base text-bone">
              <li className="flex items-center gap-1.5">
                <Check size={18} weight="bold" className="text-emerald-700" /> {t.visit.dineIn}
              </li>
              <li className="flex items-center gap-1.5 text-sage">
                <X size={18} weight="bold" className="text-amber" /> {t.visit.takeaway}
              </li>
              <li className="flex items-center gap-1.5 text-sage">
                <X size={18} weight="bold" className="text-amber" /> {t.visit.delivery}
              </li>
            </ul>
            <p className="mt-4 text-sm text-sage">
              {t.visit.price(venue.priceBand)}
              {venue.phone && (
                <>
                  {" "}
                  {t.visit.call}{" "}
                  <a href={`tel:${venue.phone.replace(/[^+\d]/g, "")}`} className="font-medium text-amber">
                    {venue.phone}
                  </a>
                  .
                </>
              )}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
