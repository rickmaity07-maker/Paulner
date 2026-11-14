"use client";

import { useEffect } from "react";

/*
  Lenis drives the scroll and hands every frame to ScrollTrigger so pinned scenes stay in sync.
  Only with a mouse or trackpad: Lenis leaves touch scrolling alone anyway, so phones skip
  it entirely. The libraries load after the page is interactive, not with it.
*/
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let cleanup = () => {};
    let cancelled = false;
    Promise.all([import("lenis"), import("gsap"), import("gsap/ScrollTrigger")]).then(([{ default: Lenis }, { gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ lerp: 0.09, anchors: true });
      lenis.on("scroll", ScrollTrigger.update);

      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      // Pinned sections are measured before the web fonts settle, so measure again after.
      document.fonts.ready.then(() => ScrollTrigger.refresh());

      cleanup = () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return null;
}
