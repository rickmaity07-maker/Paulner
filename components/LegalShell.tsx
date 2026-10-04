import Link from "next/link";
import type { ReactNode } from "react";
import Shield from "@/components/Shield";

/* The frame around Impressum and Datenschutz: logo, the text on cream paper, a way back. */
export default function LegalShell({ children }: { children: ReactNode }) {
  // German compounds ("Verbraucherstreitbeilegung") are wider than a phone, so headings may hyphenate.
  return (
    <main lang="de" className="paper min-h-[100dvh] px-4 py-14 md:py-20 [&_h1,&_h2]:hyphens-auto [&_h1,&_h2]:[overflow-wrap:break-word]">
      <div className="mx-auto w-full max-w-[820px]">
        <Link href="/" className="flex w-fit items-center gap-3 text-bone" aria-label="Paulaner Meets Route 66, zur Startseite">
          <Shield className="h-12 w-11" />
          <span className="display text-lg leading-tight">
            Paulaner <span className="text-amber">meets</span>
            <br />
            Route 66
          </span>
        </Link>
        {children}
        <nav className="mt-14 flex flex-wrap gap-x-6 border-t border-bone/10 pt-4 text-sm md:pt-6">
          <Link href="/" className="inline-flex min-h-10 items-center text-sage transition-colors hover:text-bone md:min-h-0">
            Zur Startseite
          </Link>
          <Link href="/impressum" className="inline-flex min-h-10 items-center text-sage transition-colors hover:text-bone md:min-h-0">
            Impressum
          </Link>
          <Link href="/datenschutz" className="inline-flex min-h-10 items-center text-sage transition-colors hover:text-bone md:min-h-0">
            Datenschutz
          </Link>
        </nav>
      </div>
    </main>
  );
}
