"use client";

import { motion } from "motion/react";
import { setLocale, useLanguage } from "@/lib/language";
import type { Locale } from "@/lib/types";

const OPTIONS: Locale[] = ["de", "en"];

/* DE | EN pill. German is the default; the choice is remembered on this device. */
export default function LanguageToggle({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  const { locale, t } = useLanguage();
  const dark = tone === "dark";

  return (
    <div
      role="group"
      aria-label={t.nav.language}
      className={`relative inline-flex rounded-full p-1 ${dark ? "bg-asphalt/70 ring-1 ring-chrome/15 backdrop-blur-md" : "bg-bone/[0.06] ring-1 ring-bone/10"} ${className}`}
    >
      {OPTIONS.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            lang={option}
            aria-pressed={active}
            onClick={() => setLocale(option)}
            className={`relative z-10 h-7 min-w-9 rounded-full px-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors duration-300 ${
              active ? "text-chrome" : dark ? "text-chrome/70 hover:text-chrome" : "text-bone/60 hover:text-bone"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`lang-pill-${tone}`}
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
                className="absolute inset-0 -z-10 rounded-full bg-amber"
              />
            )}
            {option}
          </button>
        );
      })}
    </div>
  );
}
