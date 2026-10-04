import { Star4 } from "@/components/Sparkles";

/*
  Two bands laid across the page at opposite angles, like tape on a roadhouse
  wall: crimson running left, Route 66 blue running right. Each list is
  doubled so the loop is seamless.
*/
function Band({ items, reverse, className }: { items: string[]; reverse?: boolean; className: string }) {
  const doubled = [...items, ...items];
  return (
    <div className={className}>
      <ul
        className={`flex w-max items-center motion-reduce:animate-none ${reverse ? "animate-marquee-reverse" : "animate-marquee"}`}
      >
        {doubled.map((item, index) => (
          <li key={index} aria-hidden={index >= items.length} className="flex items-center gap-6 pr-6 md:gap-10 md:pr-10">
            <span className="display whitespace-nowrap text-4xl text-chrome md:text-7xl">{item}</span>
            <Star4 size={30} color="#f6efe6" className="shrink-0 opacity-80" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Marquee({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Auf der Karte" className="relative overflow-hidden py-20 md:py-32">
      <Band items={items} className="relative z-10 -mx-8 -rotate-3 bg-amber py-5 shadow-[0_20px_40px_-20px_rgba(23,20,21,0.6)] md:py-7" />
      <Band items={[...items].reverse()} reverse className="-mx-8 -mt-6 rotate-2 bg-route py-4 md:-mt-10 md:py-6" />
    </section>
  );
}
