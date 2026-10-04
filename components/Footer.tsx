"use client";

import Image from "next/image";
import Link from "next/link";
import { InstagramLogo, Star } from "@phosphor-icons/react";
import FogGlass from "@/components/FogGlass";
import { NAV_LINKS, PHOTOS } from "@/lib/data";
import { useLanguage } from "@/lib/language";
import { pick, type Hero, type Venue } from "@/lib/types";

const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;

/*
  The page ends where it began: at a fogged window. The back bar glows through
  the letters, and the glass can be wiped like the one at the top.
*/
export default function Footer({ venue, hero, year }: { venue: Venue; hero: Hero; year: number }) {
  const { locale, t } = useLanguage();
  return (
    <footer className="relative bg-asphalt text-chrome">
      <div className="relative h-[70vh] min-h-[420px] touch-pan-y overflow-hidden">
        <Image src={PHOTOS.backBar} alt="" fill sizes="100vw" className="object-cover brightness-90" />
        <FogGlass word={hero.footerWord} layout="center" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-asphalt to-transparent" />
      </div>

      <div className="grid grid-cols-2 gap-10 px-4 pb-28 pt-10 md:grid-cols-12 md:px-10 lg:pb-12">
        <div className="col-span-2 md:col-span-4">
          <p className="display text-3xl leading-tight text-chrome">{pick(locale, hero.footerLine, hero.footerLineEn)}</p>
        </div>

        <div className="md:col-span-3 md:col-start-6">
          <h2 className="text-sm text-chrome/55">{t.footer.find}</h2>
          <address className="mt-3 not-italic leading-relaxed">
            <a href={venue.maps} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-neon">
              {venue.street}
              <br />
              {venue.city}
            </a>
          </address>
        </div>

        <div className="md:col-span-2">
          <h2 className="text-sm text-chrome/55">{t.footer.hello}</h2>
          <ul className="mt-2 md:mt-3 md:space-y-1.5">
            <li>
              <a
                href={venue.maps}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-1.5 transition-colors hover:text-neon md:min-h-0"
              >
                <Star size={16} weight="fill" className="text-gold" /> {t.footer.onGoogle(venue.rating)}
              </a>
            </li>
            {venue.phone && (
              <li>
                <a href={telHref(venue.phone)} className="inline-flex min-h-10 items-center md:min-h-0 transition-colors hover:text-neon">
                  {venue.phone}
                </a>
              </li>
            )}
            {venue.email && (
              <li>
                <a href={`mailto:${venue.email}`} className="inline-flex min-h-10 items-center md:min-h-0 transition-colors hover:text-neon">
                  {venue.email}
                </a>
              </li>
            )}
            {venue.instagram && (
              <li>
                <a
                  href={venue.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-1.5 transition-colors hover:text-neon md:min-h-0"
                >
                  <InstagramLogo size={18} /> Instagram
                </a>
              </li>
            )}
          </ul>
        </div>

        <nav aria-label="Footer" className="md:col-span-2">
          <h2 className="text-sm text-chrome/55">{t.footer.onPage}</h2>
          <ul className="mt-2 md:mt-3 md:space-y-1.5">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="inline-flex min-h-10 items-center md:min-h-0 transition-colors hover:text-neon">
                  {t.nav[link.key]}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <p className="col-span-2 flex flex-wrap justify-between gap-4 border-t border-chrome/10 pt-6 text-sm text-chrome/55 md:col-span-12">
          <span>{t.footer.rights(year, venue.name)}</span>
          <span className="flex flex-wrap gap-x-5">
            <Link href="/impressum" className="inline-flex min-h-10 items-center md:min-h-0 transition-colors hover:text-chrome">
              {t.footer.imprint}
            </Link>
            <Link href="/datenschutz" className="inline-flex min-h-10 items-center md:min-h-0 transition-colors hover:text-chrome">
              {t.footer.privacy}
            </Link>
            <Link href="/login" className="inline-flex min-h-10 items-center md:min-h-0 transition-colors hover:text-chrome">
              {t.footer.staff}
            </Link>
          </span>
        </p>
      </div>
    </footer>
  );
}
