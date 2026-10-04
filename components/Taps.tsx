"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight } from "@phosphor-icons/react";
import { useLanguage } from "@/lib/language";
import { pick, type Tap } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/*
  A walk along the taps. On desktop the section pins and vertical scroll pans the
  track sideways; cards alternate high and low, tall and square, and each photo
  drifts inside its frame for depth. On phones and under reduced motion it is a
  plain swipeable row with scroll snap.
*/
export default function Taps({ taps }: { taps: Tap[] }) {
  const { locale, t } = useLanguage();
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const el = track.current!;
        const distance = () => el.scrollWidth - root.current!.clientWidth;

        const pan = gsap.to(el, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });

        gsap.utils.toArray<HTMLElement>(".garden-photo").forEach((photo) => {
          gsap.fromTo(
            photo,
            { xPercent: -8 },
            {
              xPercent: 8,
              ease: "none",
              scrollTrigger: {
                trigger: photo.parentElement,
                containerAnimation: pan,
                start: "left right",
                end: "right left",
                scrub: true,
              },
            },
          );
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="taps" className="paper relative overflow-hidden bg-moss">
      <div
        ref={track}
        className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 py-24 lg:h-[100dvh] lg:snap-none lg:gap-14 lg:overflow-visible lg:px-14 lg:py-[11vh]"
      >
        <div className="flex w-[82vw] shrink-0 snap-start flex-col justify-center gap-6 sm:w-[60vw] lg:w-[30vw]">
          <p className="label text-route">{t.taps.eyebrow}</p>
          <h2 className="display text-[clamp(2.6rem,5.2vw,5.4rem)] leading-[1.02] text-amber">
            {t.taps.title(taps.length)} <em>{t.taps.titleEm}</em>
          </h2>
          <p className="max-w-[38ch] text-base leading-relaxed text-sage md:text-lg">
            {t.taps.intro}
          </p>
          <p className="flex items-center gap-2 text-sm text-bone/60 lg:hidden">
            {t.taps.swipe} <ArrowRight size={16} />
          </p>
        </div>

        {taps.map((tap, index) => {
          const low = index % 2 === 1;
          return (
            <article
              key={tap.id}
              className={`flex w-[78vw] shrink-0 snap-start gap-5 sm:w-[56vw] lg:w-auto ${
                low ? "flex-col-reverse lg:justify-start lg:self-end" : "flex-col lg:self-start"
              }`}
            >
              <div
                className={`relative overflow-hidden rounded-[1.75rem] bg-fern ring-4 ring-bone/90 ring-offset-4 ring-offset-moss ${
                  low ? "aspect-square lg:h-[44vh] lg:w-[44vh]" : "aspect-[4/5] lg:h-[52vh] lg:w-[41.6vh]"
                }`}
              >
                <div className="garden-photo absolute inset-y-0 -left-[10%] w-[120%]">
                  <Image
                    src={tap.image}
                    alt={t.taps.alt(tap.name)}
                    fill
                    sizes="(min-width: 1024px) 34vw, 80vw"
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="lg:max-w-[42vh]">
                <p className="font-mono text-xs text-route">No. {String(index + 1).padStart(2, "0")}</p>
                <h3 className="display mt-1 text-3xl text-bone md:text-5xl">{tap.name}</h3>
                <p className="mt-2 inline-block rounded-full bg-bone px-3 py-1 font-mono text-xs text-chrome">{tap.pour}</p>
                <p className="mt-3 max-w-[36ch] text-base leading-relaxed text-bone/80">{pick(locale, tap.body, tap.bodyEn)}</p>
                <a href="#drinks" className="group mt-1 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-amber">
                  {t.taps.menu}
                  <ArrowRight size={16} className="transition-transform duration-500 ease-leaf group-hover:translate-x-1" />
                </a>
              </div>
            </article>
          );
        })}

        <div aria-hidden="true" className="w-1 shrink-0 lg:w-[4vw]" />
      </div>
    </section>
  );
}
