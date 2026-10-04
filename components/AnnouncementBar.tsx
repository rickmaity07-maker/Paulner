"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Megaphone, Warning, Confetti, X } from "@phosphor-icons/react";
import { useLanguage } from "@/lib/language";
import { pick, type Announcement } from "@/lib/types";

const TONES = {
  info: { className: "bg-route text-chrome", Icon: Megaphone },
  event: { className: "bg-amber text-chrome", Icon: Confetti },
  warning: { className: "bg-gold text-asphalt", Icon: Warning },
} as const;

/* A one-line notice set from the admin portal: an event, a change of hours, a closure. */
export default function AnnouncementBar({ announcement }: { announcement: Announcement }) {
  const [open, setOpen] = useState(true);
  const { locale, t } = useLanguage();
  if (!announcement.enabled || !announcement.text.trim()) return null;
  const { className, Icon } = TONES[announcement.tone] ?? TONES.info;

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          role="status"
          initial={{ height: 0 }}
          animate={{ height: "auto" }}
          exit={{ height: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`relative z-[45] overflow-hidden ${className}`}
        >
          <div className="flex items-center gap-3 px-4 py-3 md:px-10">
            <Icon size={18} weight="fill" className="shrink-0" aria-hidden="true" />
            <p className="flex-1 text-sm font-medium md:text-base">{pick(locale, announcement.text, announcement.textEn)}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.notice.dismiss}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/10"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
