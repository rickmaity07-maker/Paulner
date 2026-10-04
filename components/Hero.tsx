"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { Star } from "@phosphor-icons/react";
import ButtonLink from "@/components/ButtonLink";
import FogGlass from "@/components/FogGlass";
import Shield from "@/components/Shield";
import { PHOTOS } from "@/lib/data";
import { describeStatus, openStatus, type OpenStatus } from "@/lib/hours";
import { useLanguage } from "@/lib/language";
import { pick, type Closure, type DayHours, type Hero as HeroContent, type Venue } from "@/lib/types";

interface HeroProps {
  hero: HeroContent;
  venue: Venue;
  hours: DayHours[];
  closures: Closure[];
  bookingEnabled: boolean;
}

/* "Jetzt geöffnet" / "Öffnet um 15:30", worked out in the visitor's browser against Schweinfurt time. */
function useOpenStatus(hours: DayHours[], closures: Closure[]) {
  const [status, setStatus] = useState<OpenStatus | null>(null);
  useEffect(() => {
    const tick = () => setStatus(openStatus(hours, closures));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [hours, closures]);
  return status;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/*
  Route 66 neon at night behind a fogged bar window, edge to edge. The glass
  steams up, then the name is written into the condensation along the bottom.
  The photo leans gently toward the pointer, the neon stutters now and then,
  and a spinning roadside badge sits in the corner. Scrolling away sinks the
  photo and fades the panel.
*/
export default function Hero({ hero, venue, hours, closures, bookingEnabled }: HeroProps) {
  const root = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const status = useOpenStatus(hours, closures);
  const { locale, t } = useLanguage();

  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.12, 1.24]);
  const panelOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const panelY = useTransform(scrollYProgress, [0, 0.4], [0, -40]);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const tiltX = useSpring(px, { stiffness: 60, damping: 20 });
  const tiltY = useSpring(py, { stiffness: 60, damping: 20 });
  // The glow only follows the mouse: repainting two full-screen gradients on every phone wobble is too costly.
  const gx = useMotionValue(0);
  const gy = useMotionValue(0);
  const glowX = useTransform(useSpring(gx, { stiffness: 60, damping: 20 }), (v) => 50 + v * 1.4);
  const glowY = useTransform(useSpring(gy, { stiffness: 60, damping: 20 }), (v) => 32 + v * 1.4);
  const blueX = useTransform(glowX, (v) => v + 18);
  const blueY = useTransform(glowY, (v) => v - 6);
  const pinkGlow = useMotionTemplate`radial-gradient(38% 32% at ${glowX}% ${glowY}%, rgba(255,61,94,0.28), transparent 70%)`;
  const blueGlow = useMotionTemplate`radial-gradient(30% 26% at ${blueX}% ${blueY}%, rgba(31,120,173,0.25), transparent 70%)`;

  const handleMove = (event: PointerEvent<HTMLElement>) => {
    if (reduce || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set(((event.clientX - rect.left) / rect.width - 0.5) * -24);
    py.set(((event.clientY - rect.top) / rect.height - 0.5) * -16);
    gx.set(px.get());
    gy.set(py.get());
  };

  // Phones: the photo leans as the phone tilts, measured from however it was held at first.
  // iOS only reports tilt after a permission prompt, which a hero should not raise, so it stays still there.
  useEffect(() => {
    const Orientation = window.DeviceOrientationEvent as unknown as { requestPermission?: unknown } | undefined;
    if (reduce || !Orientation || typeof Orientation.requestPermission === "function") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    let base: { beta: number; gamma: number } | null = null;
    const onTilt = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      base ??= { beta: event.beta, gamma: event.gamma };
      const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));
      px.set(clamp((event.gamma - base.gamma) * -0.8, 12));
      py.set(clamp((event.beta - base.beta) * -0.5, 8));
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => window.removeEventListener("deviceorientation", onTilt);
  }, [reduce, px, py]);

  return (
    <section
      ref={root}
      id="top"
      onPointerMove={handleMove}
      className="relative h-[100svh] min-h-[640px] touch-pan-y overflow-hidden bg-asphalt"
    >
      <motion.div style={{ y: photoY }} className="absolute inset-0">
        <motion.div style={{ x: tiltX, y: tiltY, scale: photoScale }} className="absolute inset-0">
          <Image
            src={PHOTOS.heroGlasshouse}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_60%] brightness-90"
          />
        </motion.div>
      </motion.div>

      {/* Neon spill on the glass. It follows the tilt a little and flickers like an old tube. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 animate-flicker mix-blend-screen motion-reduce:animate-none">
        <motion.div style={{ backgroundImage: pinkGlow }} className="absolute inset-0" />
        <motion.div style={{ backgroundImage: blueGlow }} className="absolute inset-0" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-b from-asphalt/50 via-transparent to-asphalt/30" />

      <FogGlass word={hero.fogWord} layout="baseline" hint={t.hero.hint} touchHint={t.hero.hintTouch} />

      <h1 className="sr-only">{t.hero.h1(venue.name, venue.street, venue.city)}</h1>

      {/* Spinning roadside badge. */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.4, rotate: -90 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 14, delay: 2.4 }}
        className="pointer-events-none absolute right-6 top-6 hidden h-36 w-36 md:block lg:right-10 lg:top-10 lg:h-44 lg:w-44"
      >
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-[spin_26s_linear_infinite] motion-reduce:animate-none">
          <defs>
            <path id="badge-ring" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
          </defs>
          <circle cx="100" cy="100" r="98" fill="rgba(23,20,21,0.55)" />
          <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(246,239,230,0.35)" strokeDasharray="2 6" />
          <text fontSize="13" fill="#f6efe6" fontFamily="var(--font-geist), sans-serif" fontWeight="600">
            <textPath href="#badge-ring" textLength="482" lengthAdjust="spacing">
              {t.hero.badge}
            </textPath>
          </text>
        </svg>
        <Shield className="absolute inset-[27%] drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)]" />
      </motion.div>

      <motion.div
        style={{ opacity: panelOpacity, y: panelY }}
        className="absolute left-4 right-4 top-16 md:left-8 md:right-auto md:top-8"
      >
        <motion.div
          initial={{ opacity: 0, y: -24, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.1, delay: 2.2, ease: EASE }}
          className="max-w-md rounded-[1.75rem] bg-asphalt/65 p-1.5 ring-1 ring-chrome/15 backdrop-blur-md md:bg-asphalt/55 md:backdrop-blur-xl"
        >
          <div className="rounded-[calc(1.75rem-0.375rem)] p-6 shadow-[inset_0_1px_1px_rgba(246,239,230,0.12)] md:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`label inline-flex items-center gap-2 rounded-full px-3 py-2.5 md:py-1.5 ${
                  status?.open ? "bg-emerald-400/15 text-emerald-200" : "bg-chrome/10 text-chrome/80"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  {status?.open && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70" />}
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${status?.open ? "bg-emerald-300" : "bg-gold"}`} />
                </span>
                <span>{status ? describeStatus(status, t) : t.hours.checking}</span>
              </span>
              <a
                href={venue.maps}
                target="_blank"
                rel="noopener noreferrer"
                className="label inline-flex items-center gap-1.5 rounded-full bg-chrome/10 px-3 py-2.5 text-chrome/85 md:py-1.5 transition-colors hover:bg-chrome/20"
              >
                <Star size={12} weight="fill" className="text-gold" />
                {t.hero.reviews(venue.rating, venue.reviews)}
              </a>
            </div>

            <p className="mt-5 text-lg leading-relaxed text-chrome md:text-xl">{pick(locale, hero.tagline, hero.taglineEn)}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              {bookingEnabled && <ButtonLink href="#book">{t.hero.book}</ButtonLink>}
              {/* Short phones: the dock already links the menu, and the word and hint need the room. */}
              <ButtonLink href="#drinks" variant="ghost" className="max-md:[@media(max-height:700px)]:hidden">
                {t.hero.menu}
              </ButtonLink>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
