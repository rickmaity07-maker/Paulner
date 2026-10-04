import Link from "next/link";
import type { ReactNode } from "react";
import Shield from "@/components/Shield";

/* The frame around Impressum and Datenschutz: logo, the text on cream paper, a way back. */
export default function LegalShell({ children }: { children: ReactNode }) {
  return (
    <main lang="de" className="paper min-h-[100dvh] px-4 py-14 md:py-20">
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
        <nav className="mt-14 flex flex-wrap gap-6 border-t border-bone/10 pt-6 text-sm">
          <Link href="/" className="text-sage transition-colors hover:text-bone">
            Zur Startseite
          </Link>
          <Link href="/impressum" className="text-sage transition-colors hover:text-bone">
            Impressum
          </Link>
          <Link href="/datenschutz" className="text-sage transition-colors hover:text-bone">
            Datenschutz
          </Link>
        </nav>
      </div>
    </main>
  );
}
