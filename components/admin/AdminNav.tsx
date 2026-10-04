"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  AddressBook,
  BeerStein,
  CashRegister,
  CalendarCheck,
  DeviceTablet,
  ChartPieSlice,
  ClockCounterClockwise,
  Clock,
  Storefront,
  TextAa,
  Users,
  Wine,
  type Icon,
} from "@phosphor-icons/react";

const LINKS: { href: string; label: string; Icon: Icon }[] = [
  { href: "/admin", label: "Übersicht", Icon: ChartPieSlice },
  { href: "/admin/kasse", label: "Live-Kasse", Icon: CashRegister },
  { href: "/admin/gaeste", label: "Gäste & Schulden", Icon: AddressBook },
  { href: "/admin/bookings", label: "Reservierungen", Icon: CalendarCheck },
  { href: "/admin/menu", label: "Getränkekarte", Icon: Wine },
  { href: "/admin/taps", label: "Vom Fass", Icon: BeerStein },
  { href: "/admin/hours", label: "Öffnungszeiten", Icon: Clock },
  { href: "/admin/content", label: "Texte & Hinweis", Icon: TextAa },
  { href: "/admin/venue", label: "Bar & Sicherung", Icon: Storefront },
  { href: "/admin/users", label: "Nutzer & Rollen", Icon: Users },
  { href: "/admin/app", label: "Tablet-App", Icon: DeviceTablet },
  { href: "/admin/activity", label: "Protokoll", Icon: ClockCounterClockwise },
];

export default function AdminNav({ pending }: { pending: number }) {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);

  // Phones: the nav is a sideways row, so bring the current page's tab into view.
  useEffect(() => {
    const row = nav.current;
    const current = row?.querySelector<HTMLElement>("[aria-current=page]");
    if (!row || !current || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: current.offsetLeft - (row.clientWidth - current.offsetWidth) / 2, behavior: "smooth" });
  }, [pathname]);

  return (
    <nav ref={nav} aria-label="Verwaltung" className="no-scrollbar relative -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
      {LINKS.map(({ href, label, Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex shrink-0 items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              active ? "text-chrome" : "text-chrome/60 hover:bg-chrome/5 hover:text-chrome"
            }`}
          >
            {active && (
              <motion.span
                layoutId="admin-nav"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                className="absolute inset-0 rounded-2xl bg-amber shadow-[0_8px_24px_-10px_rgba(179,32,58,0.8)]"
              />
            )}
            <Icon size={19} weight={active ? "fill" : "regular"} className="relative" />
            <span className="relative">{label}</span>
            {href === "/admin/bookings" && pending > 0 && (
              <span className="relative ml-auto rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold text-asphalt">{pending}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
