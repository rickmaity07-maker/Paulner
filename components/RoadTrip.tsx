"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { Star4 } from "@/components/Sparkles";
import { useLanguage } from "@/lib/language";

/*
  The signature scroll moment: a stretch of Route 66 at night. The section pins
  while you scroll; a '57 Bel Air (seen from above) drives the length of the
  road, the centre line paints itself in behind it, and roadside signs pop up
  as the car passes them. Landscape screens get a road that winds left to
  right; portrait screens one that winds top to bottom.
*/

interface Stop {
  at: number; // 0..1 along the road
  title: string;
  sub: string;
  side: 1 | -1;
}

const ROADS = {
  wide: {
    box: [1600, 900] as const,
    d: "M -80 640 C 180 640 260 300 520 300 S 820 640 1060 600 S 1300 250 1680 260",
  },
  tall: {
    box: [900, 1600] as const,
    d: "M 260 -80 C 260 220 700 260 680 520 S 180 760 220 1020 S 720 1260 640 1680",
  },
};

function useIsPortrait() {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-aspect-ratio: 1/1)");
    const update = () => setPortrait(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return portrait;
}

function Car() {
  return (
    <g>
      {/* Headlight beams */}
      <path d="M44 -14 L190 -62 L190 18 L44 -4 Z" fill="url(#beam)" />
      <path d="M44 4 L190 -18 L190 62 L44 14 Z" fill="url(#beam)" />
      <ellipse cx="0" cy="6" rx="60" ry="30" fill="rgba(0,0,0,0.45)" />
      {/* Tail fins */}
      <path d="M-56 -26 L-34 -24 L-34 -14 L-58 -16 Z" fill="#1d6a99" />
      <path d="M-56 26 L-34 24 L-34 14 L-58 16 Z" fill="#1d6a99" />
      <rect x="-54" y="-25" width="104" height="50" rx="16" fill="#2f8fc4" />
      <rect x="-54" y="-25" width="104" height="50" rx="16" fill="none" stroke="#0f4566" strokeWidth="2" />
      {/* Chrome side trim */}
      <path d="M-46 -25 H38" stroke="#f6efe6" strokeWidth="2.5" />
      <path d="M-46 25 H38" stroke="#f6efe6" strokeWidth="2.5" />
      {/* Hood stripes, windscreen, white roof, rear window */}
      <path d="M20 -8 H44 M20 8 H44" stroke="#9fd1ee" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 -20 Q16 0 2 20 L-6 18 Q4 0 -6 -18 Z" fill="#1a2a35" />
      <rect x="-30" y="-19" width="26" height="38" rx="8" fill="#f6efe6" />
      <path d="M-32 -17 Q-40 0 -32 17 L-36 16 Q-44 0 -36 -16 Z" fill="#1a2a35" />
      {/* Headlights and tail lights */}
      <circle cx="48" cy="-15" r="4" fill="#fff6c9" />
      <circle cx="48" cy="15" r="4" fill="#fff6c9" />
      <rect x="-58" y="-20" width="4" height="8" rx="2" fill="#ff3d5e" />
      <rect x="-58" y="12" width="4" height="8" rx="2" fill="#ff3d5e" />
    </g>
  );
}

function Sign({ stop, point, progress, reduce }: { stop: Stop; point: { x: number; y: number; nx: number; ny: number }; progress: MotionValue<number>; reduce: boolean }) {
  const shown = useTransform(progress, [stop.at - 0.06, stop.at], [0, 1], { clamp: true });
  const scale = useSpring(useTransform(shown, [0, 1], [0.3, 1]), { stiffness: 260, damping: 16 });
  const x = point.x + point.nx * 150 * stop.side;
  const y = point.y + point.ny * 150 * stop.side;
  return (
    <g transform={`translate(${x} ${y})`}>
    <motion.g style={reduce ? undefined : { opacity: shown, scale, transformOrigin: "50% 100%" }}>
      <line x1="0" y1="10" x2="0" y2="70" stroke="#6d605a" strokeWidth="5" />
      <rect x="-118" y="-58" width="236" height="76" rx="14" fill="#f3e7da" stroke="#171415" strokeWidth="4" />
      <rect x="-110" y="-50" width="220" height="60" rx="9" fill="none" stroke="#b3203a" strokeWidth="2" />
      <text x="0" y="-18" textAnchor="middle" fontFamily="var(--font-rye), Georgia, serif" fontSize="24" fill="#b3203a">
        {stop.title}
      </text>
      <text x="0" y="5" textAnchor="middle" fontFamily="var(--font-geist), sans-serif" fontWeight="600" fontSize="14" letterSpacing="2" fill="#1f78ad">
        {stop.sub.toUpperCase()}
      </text>
    </motion.g>
    </g>
  );
}

export interface RoadFacts {
  cheapest: number | null;
  opens: string | null;
  rating: string;
  reviews: number;
  street: string;
  city: string;
}

const euro = (value: number, locale: string) =>
  new Intl.NumberFormat(locale === "en" ? "en-GB" : "de-DE", { style: "currency", currency: "EUR" }).format(value);

export default function RoadTrip({ facts }: { facts: RoadFacts }) {
  const { locale, t } = useLanguage();
  const stops: Stop[] = useMemo(
    () => [
      { at: 0.2, title: facts.cheapest ? t.road.from(euro(facts.cheapest, locale)) : t.road.coldBeer, sub: t.road.onTap, side: 1 },
      { at: 0.44, title: facts.opens ? t.road.doors(facts.opens) : t.road.late, sub: t.road.seat, side: -1 },
      { at: 0.68, title: t.road.stars(facts.rating), sub: t.road.reviews(facts.reviews), side: 1 },
      { at: 0.9, title: facts.street, sub: facts.city.replace(/^\d+\s*/, ""), side: -1 },
    ],
    [facts, locale, t],
  );
  const root = useRef<HTMLElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const carRef = useRef<SVGGElement>(null);
  const reduce = useReducedMotion() ?? false;
  const portrait = useIsPortrait();
  const road = portrait ? ROADS.tall : ROADS.wide;
  const [points, setPoints] = useState<{ x: number; y: number; nx: number; ny: number }[]>([]);

  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });
  const progress = reduce ? scrollYProgress : smooth;
  const drawn = useTransform(progress, [0, 1], [0.02, 1]);

  // Where each sign stands: a point on the road plus the road's normal there.
  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    setPoints(
      stops.map((stop) => {
        const p = path.getPointAtLength(stop.at * total);
        const q = path.getPointAtLength(Math.min(total, stop.at * total + 1));
        const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
        return { x: p.x, y: p.y, nx: -(q.y - p.y) / len, ny: (q.x - p.x) / len };
      }),
    );
  }, [road.d, stops]);

  // The car is placed by hand each frame: position and heading straight off the path.
  const placeCar = (value: number) => {
    const path = pathRef.current;
    const car = carRef.current;
    if (!path || !car) return;
    const total = path.getTotalLength();
    const at = Math.min(total - 1, Math.max(0, (reduce ? 1 : value) * total));
    const p = path.getPointAtLength(at);
    const q = path.getPointAtLength(at + 1);
    const angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
    car.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${angle})`);
  };
  useMotionValueEvent(progress, "change", placeCar);
  useEffect(() => placeCar(progress.get()));

  return (
    <section ref={root} aria-label={t.road.label} className="relative h-[280vh] bg-asphalt lg:h-[340vh]">
      <div className="sticky top-0 h-[100dvh] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,61,94,0.14),transparent_70%),radial-gradient(50%_40%_at_100%_100%,rgba(31,120,173,0.16),transparent_70%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {[
            ["8%", "70%", 14],
            ["16%", "22%", 10],
            ["30%", "88%", 12],
            ["62%", "6%", 16],
            ["78%", "48%", 10],
            ["88%", "80%", 14],
          ].map(([top, left, size], index) => (
            <span
              key={index}
              className="absolute animate-twinkle opacity-60 motion-reduce:animate-none"
              style={{ top: top as string, left: left as string, animationDelay: `${index * 0.45}s` }}
            >
              <Star4 size={size as number} color="#f6efe6" />
            </span>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${road.box[0]} ${road.box[1]}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="beam" x1="0" x2="1">
              <stop offset="0" stopColor="#fff6c9" stopOpacity="0.55" />
              <stop offset="1" stopColor="#fff6c9" stopOpacity="0" />
            </linearGradient>
            <mask id="line-mask">
              <motion.path d={road.d} fill="none" stroke="#fff" strokeWidth="20" style={{ pathLength: drawn }} />
            </mask>
          </defs>
          {/* Shoulder, asphalt, edge lines, then the centre line painted in behind the car. */}
          <path d={road.d} fill="none" stroke="#2b2526" strokeWidth="176" strokeLinecap="round" />
          <path d={road.d} fill="none" stroke="#f6efe6" strokeOpacity="0.55" strokeWidth="150" strokeLinecap="round" />
          <path ref={pathRef} d={road.d} fill="none" stroke="#3a3536" strokeWidth="142" strokeLinecap="round" />
          <path d={road.d} fill="none" stroke="#e8a33a" strokeWidth="6" strokeDasharray="34 26" mask="url(#line-mask)" />

          {points.length === stops.length &&
            stops.map((stop, index) => <Sign key={index} stop={stop} point={points[index]} progress={progress} reduce={reduce} />)}

          <g ref={carRef}>
            <Car />
          </g>
        </svg>

        <div className="pointer-events-none relative z-10 px-4 pt-24 md:px-10 md:pt-16 lg:pt-14">
          <p className="label text-chrome/60">{t.road.hint}</p>
          <h2 className="display mt-3 max-w-[14ch] text-[clamp(2.4rem,5vw,4.8rem)] leading-[1.04] text-chrome">
            {t.road.title} <span className="neon animate-flicker motion-reduce:animate-none">{t.road.titleNeon}</span>
          </h2>
        </div>
      </div>
    </section>
  );
}
