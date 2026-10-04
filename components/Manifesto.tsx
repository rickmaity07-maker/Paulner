"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import Sparkles from "@/components/Sparkles";
import { PHOTOS } from "@/lib/data";
import { useLanguage } from "@/lib/language";

const PHOTO_FOR = { beer: PHOTOS.beerSmall, sign: PHOTOS.signSmall, car: PHOTOS.carSmall } as const;

function Word({ text, accent, progress, range }: { text: string; accent?: boolean; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className={`motion-reduce:opacity-100! ${accent ? "text-amber" : ""}`}>
      {text}{" "}
    </motion.span>
  );
}

function InlinePhoto({ src, alt, progress, range }: { src: string; alt: string; progress: MotionValue<number>; range: [number, number] }) {
  const scale = useTransform(progress, range, [0, 1]);
  return (
    <>
      <motion.span
        style={{ scale }}
        className="relative inline-block h-[0.78em] w-[1.7em] origin-center overflow-hidden rounded-full bg-fern align-[-0.06em] ring-2 ring-bone motion-reduce:scale-100!"
      >
        <Image src={src} alt={alt} fill sizes="160px" className="object-cover" />
      </motion.span>{" "}
    </>
  );
}

/*
  A statement that lights up word by word as it passes through the viewport,
  with small round photos opening up between the words. Set flush right with
  a wide empty margin on the left. Fully lit under reduced motion.
*/
export default function Manifesto() {
  const root = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: root, offset: ["start 0.85", "end 0.45"] });
  const { locale, t } = useLanguage();
  const tokens = t.manifesto;
  const count = tokens.length;

  return (
    <section className="paper relative px-4 py-28 md:px-10 md:py-56">
      <Sparkles />
      <p
        ref={root}
        lang={locale}
        className="display ml-auto max-w-[20ch] text-[clamp(2.1rem,5.2vw,5.2rem)] leading-[1.12] text-bone"
      >
        {tokens.map((token, index) => {
          const range: [number, number] = [index / count, (index + 1) / count];
          return token.word ? (
            <Word key={`${locale}-${index}`} text={token.word} accent={Boolean(token.accent)} progress={scrollYProgress} range={range} />
          ) : (
            <InlinePhoto
              key={`${locale}-${index}`}
              src={PHOTO_FOR[token.image as keyof typeof PHOTO_FOR]}
              alt={t.manifestoAlt[token.image as keyof typeof PHOTO_FOR]}
              progress={scrollYProgress}
              range={range}
            />
          );
        })}
      </p>
    </section>
  );
}
