import { connection } from "next/server";
import AnnouncementBar from "@/components/AnnouncementBar";
import Book from "@/components/Book";
import Drinks from "@/components/Drinks";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Info from "@/components/Info";
import Manifesto from "@/components/Manifesto";
import Marquee from "@/components/Marquee";
import MotionProvider from "@/components/MotionProvider";
import Rail from "@/components/Rail";
import RoadTrip from "@/components/RoadTrip";
import SmoothScroll from "@/components/SmoothScroll";
import Taps from "@/components/Taps";
import Visit from "@/components/Visit";
import { todayISO } from "@/lib/booking";
import { getSite } from "@/lib/store";

export default async function Home() {
  // Content lives in the database and the portal edits it, so render per request.
  await connection();
  const site = await getSite();
  const bookingEnabled = site.booking.enabled;
  const cheapest = site.menu
    .flatMap((category) => category.drinks)
    .filter((drink) => !drink.soldOut)
    .map((drink) => Number(drink.price))
    .filter((price) => price > 0)
    .sort((a, b) => a - b)[0];
  const opens = site.hours.find((day) => day.open)?.open;

  const facts = {
    cheapest: cheapest ?? null,
    opens: opens ?? null,
    rating: site.venue.rating,
    reviews: site.venue.reviews,
    street: site.venue.street,
    city: site.venue.city,
  };

  return (
    <MotionProvider>
      <SmoothScroll />
      <div
        aria-hidden="true"
        className="grain pointer-events-none fixed inset-0 z-[60] hidden opacity-[0.06] mix-blend-multiply md:block"
      />
      <Rail bookingEnabled={bookingEnabled} />

      {/* The side rail is 6rem wide on desktop; everything else sits to its right. */}
      <div className="lg:pl-24">
        <AnnouncementBar announcement={site.announcement} />
        {/* overflow-x-clip (not hidden) so position: sticky keeps working inside. */}
        <main className="relative z-10 w-full max-w-full overflow-x-clip">
          <Hero
            hero={site.hero}
            venue={site.venue}
            hours={site.hours}
            closures={site.closures}
            bookingEnabled={bookingEnabled}
          />
          <Manifesto />
          <RoadTrip facts={facts} />
          <Drinks menu={site.menu} />
          {site.taps.length > 0 && <Taps taps={site.taps} />}
          {site.info.length > 0 && <Info info={site.info} />}
          <Marquee items={site.marquee} />
          <Visit venue={site.venue} hours={site.hours} closures={site.closures} today={todayISO()} />
          {bookingEnabled && <Book rules={{ hours: site.hours, closures: site.closures, booking: site.booking }} street={site.venue.street} />}
        </main>
        <Footer venue={site.venue} hero={site.hero} year={new Date().getFullYear()} />
      </div>
    </MotionProvider>
  );
}
