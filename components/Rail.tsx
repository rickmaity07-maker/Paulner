"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { BeerBottle, BeerStein, CalendarCheck, GearSix, Info, MapPin, UserCircle, type Icon } from "@phosphor-icons/react";
import LanguageToggle from "@/components/LanguageToggle";
import Shield from "@/components/Shield";
import { useAccount } from "@/lib/account";
import { NAV_LINKS } from "@/lib/data";
import { useHtmlLang, useLanguage } from "@/lib/language";

const ICONS: Record<(typeof NAV_LINKS)[number]["icon"], Icon> = {
  stein: BeerStein,
  bottle: BeerBottle,
  info: Info,
  pin: MapPin,
};

/* An evening at the bar, doors at 15:30 through to midnight. */
const SPAN = 8.5 * 60;
function clock(progress: number) {
  const minutes = Math.round((progress * SPAN) / 15) * 15 + 15.5 * 60;
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* Which section is under the middle of the screen, for the active link. */
function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const ids = NAV_LINKS.map((link) => link.href.slice(1));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return active;
}

/* Profile for guests, the portal for owners, the shared login for everyone else. */
function AccountLink({ className, iconSize }: { className: string; iconSize: number }) {
  const { t } = useLanguage();
  const { account } = useAccount();
  const owner = account?.role === "owner";
  const href = account ? (owner ? "/admin" : "/profile") : "/login";
  const label = account ? (owner ? t.nav.admin : t.nav.account) : t.nav.signIn;
  const Glyph = owner ? GearSix : UserCircle;
  return (
    <Link href={href} aria-label={label} className={className}>
      <Glyph size={iconSize} weight={account ? "fill" : "regular"} />
      <span className="whitespace-nowrap text-[10px] font-semibold uppercase leading-none lg:text-[9px] lg:tracking-[0.12em]">{label}</span>
    </Link>
  );
}

/*
  Desktop: a fixed rail down the left edge. Logo and language switch at the
  top, sections in the middle, and between them and the book button a line
  that fills as you scroll, with the hour of the evening riding on it.
  Phones: the same links in a floating dock at the bottom of the screen, and
  the language switch pinned top right.
*/
/* Phones: the floating DE/EN switch steps aside while you scroll down and comes back when you scroll up. */
function useHideOnScrollDown() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setHidden(y > last && y > 160);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return hidden;
}

export default function Rail({ bookingEnabled }: { bookingEnabled: boolean }) {
  const toggleHidden = useHideOnScrollDown();
  useHtmlLang();
  const { t } = useLanguage();
  const active = useActiveSection();
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const progress = reduce ? scrollYProgress : smooth;
  const time = useTransform(progress, clock);
  const knob = useTransform(progress, [0, 1], ["0%", "100%"]);

  return (
    <>
      <nav
        aria-label={t.nav.main}
        className="fixed inset-y-0 left-0 z-40 hidden w-24 flex-col items-center border-r border-bone/10 bg-night/85 py-6 backdrop-blur-xl lg:flex"
      >
        <a href="#top" aria-label={t.nav.home} className="group flex flex-col items-center gap-1.5">
          <Shield className="h-12 w-11 transition-transform duration-500 ease-leaf group-hover:-rotate-6 group-hover:scale-110" />
          <span className="label text-[9px] leading-none text-sage">Paulaner</span>
        </a>

        <LanguageToggle className="mt-5" />

        <ul className="mt-6 flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const Glyph = ICONS[link.icon];
            const isActive = active === link.href.slice(1);
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex w-[72px] flex-col items-center gap-1.5 rounded-2xl py-3 transition-colors duration-500 ease-leaf ${
                    isActive ? "bg-bone/10 text-amber" : "text-bone/60 hover:text-bone"
                  }`}
                >
                  <Glyph size={22} weight={isActive ? "fill" : "regular"} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{t.nav[link.key]}</span>
                </a>
              </li>
            );
          })}
        </ul>

        <div aria-hidden="true" className="relative my-6 w-px flex-1 bg-bone/15">
          <motion.div style={{ scaleY: progress }} className="absolute inset-0 origin-top bg-amber" />
          <motion.div style={{ top: knob }} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.span className="block rounded-full bg-bone px-2 py-1 font-mono text-[10px] text-chrome ring-1 ring-amber/60">
              {time}
            </motion.span>
          </motion.div>
        </div>

        <AccountLink
          iconSize={22}
          className="mb-3 flex w-[72px] flex-col items-center gap-1 rounded-2xl py-2.5 text-bone/60 transition-colors hover:text-bone"
        />

        {bookingEnabled && (
          <a
            href="#book"
            className="flex h-[72px] w-[72px] flex-col items-center justify-center gap-1 rounded-2xl bg-amber text-chrome transition-colors duration-500 ease-leaf hover:bg-route active:scale-[0.97]"
          >
            <CalendarCheck size={22} weight="bold" />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">{t.nav.book}</span>
          </a>
        )}
      </nav>

      <div
        className={`fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex items-center gap-2 transition-[transform,opacity] duration-300 lg:hidden ${
          toggleHidden ? "pointer-events-none -translate-y-16 opacity-0" : ""
        }`}
      >
        <LanguageToggle tone="dark" />
      </div>

      <nav
        aria-label={t.nav.main}
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex h-16 items-center justify-between rounded-full bg-night/90 pl-2 pr-2 ring-1 ring-bone/15 backdrop-blur-xl shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8)] lg:hidden"
      >
        {NAV_LINKS.map((link) => {
          const Glyph = ICONS[link.icon];
          const isActive = active === link.href.slice(1);
          return (
            <a
              key={link.href}
              href={link.href}
              aria-label={t.nav[link.key]}
              aria-current={isActive ? "true" : undefined}
              className={`flex h-12 min-w-11 flex-col items-center justify-center gap-1 rounded-full px-0.5 transition-colors ${
                isActive ? "text-amber" : "text-bone/70"
              }`}
            >
              <Glyph size={20} weight={isActive ? "fill" : "regular"} />
              <span className="whitespace-nowrap text-[10px] font-semibold uppercase leading-none">{t.nav[link.key]}</span>
            </a>
          );
        })}
        <AccountLink
          iconSize={20}
          className="flex h-12 min-w-11 flex-col items-center justify-center gap-1 rounded-full px-0.5 text-bone/70"
        />
        {bookingEnabled && (
          <a href="#book" aria-label={t.nav.book} className="flex h-12 w-12 items-center justify-center rounded-full bg-amber text-chrome active:scale-[0.97]">
            <CalendarCheck size={20} weight="bold" />
          </a>
        )}
      </nav>
    </>
  );
}
