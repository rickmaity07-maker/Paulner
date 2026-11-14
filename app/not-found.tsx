import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Seite nicht gefunden | Paulaner Meets Route 66",
  robots: { index: false },
};

/* Any address that doesn't exist: stays in the bar's look and leads back in. */
export default function NotFound() {
  return (
    <LegalShell>
      <p className="mt-10 font-mono text-sm uppercase tracking-[0.2em] text-sage">Fehler 404 · Error 404</p>
      <h1 className="display mt-3 text-[clamp(2.5rem,6vw,4rem)] leading-none text-amber">Falsche Ausfahrt.</h1>
      <p className="mt-6 max-w-[60ch] text-base leading-relaxed text-bone/85">
        Diese Seite gibt es nicht, oder nicht mehr. Die Karte, die Öffnungszeiten und die Reservierung findet ihr auf der Startseite.
      </p>
      <p lang="en" className="mt-2 max-w-[60ch] text-base leading-relaxed text-bone/60">
        This page doesn&apos;t exist. The menu, opening hours and bookings are on the homepage.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-12 items-center rounded-full bg-amber px-6 font-medium text-chrome transition-colors hover:bg-route"
      >
        Zur Startseite
      </Link>
    </LegalShell>
  );
}
