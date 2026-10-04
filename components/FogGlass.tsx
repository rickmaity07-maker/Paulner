"use client";

import { useEffect, useRef, useState } from "react";

/*
  Condensation on the bar window.

  Four canvases:
    fog    a pre-painted texture of mist and beaded droplets, built once per size
    mist   soft banks of vapour, larger than the glass, drawn drifting on top so
           the fog never looks frozen
    mask   how much of the glass has been wiped; the pointer and the running
           drops paint into it, and it fades back toward zero so the fog regrows
    view   the visible canvas: fog + mist, minus the mask, minus the word, plus
           the drops themselves

  Sequence the first time the glass is seen:
    0.0s   clear glass, steaming up
    1.2s   fully fogged; a fingertip starts writing the word, left to right
    3.0s   the word is finished and a few drops gather under the letters and run

  After that, drops form on their own every so often and slide down, leaving a
  clear trail, and wiping is wider the faster the pointer moves.

  layout "baseline": the word runs along the bottom edge, left aligned (hero).
  layout "center":   the word sits in the middle (footer).
*/

const BRUSH_RADIUS = 52;
const REGROW_EVERY = 4; // frames between fade steps
const REGROW_ALPHA = 0.032; // how much of the wipe each fade step removes
const STEAM_SECONDS = 1.2;
const WRITE_START = 1.0;
const WRITE_SECONDS = 1.8;
const MAX_DRIPS = 60;

interface Drip {
  x: number;
  y: number;
  vy: number;
  r: number;
  life: number;
  wobble: number;
  pause: number;
}

interface FogGlassProps {
  word: string;
  layout?: "baseline" | "center";
  hint?: string;
}

function paintFog(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(206, 208, 214, 0.44)";
  ctx.fillRect(0, 0, w, h);

  // A colder band near the bottom, where condensation always gathers thickest.
  const bottom = ctx.createLinearGradient(0, h * 0.55, 0, h);
  bottom.addColorStop(0, "rgba(230, 232, 238, 0)");
  bottom.addColorStop(1, "rgba(230, 232, 238, 0.22)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, w, h);

  const banks = Math.round((w * h) / 9000);
  for (let i = 0; i < banks; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 60 + Math.random() * 220;
    const light = Math.random() > 0.3;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.04 + Math.random() * 0.1;
    g.addColorStop(0, light ? `rgba(238, 240, 246, ${a})` : `rgba(120, 118, 130, ${a * 0.6})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Beaded droplets: a bright rim on top, a dark lens below, like real condensation.
  const beads = Math.round((w * h) / 650);
  for (let i = 0; i < beads; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() < 0.92 ? 0.5 + Math.random() * 1.4 : 2 + Math.random() * 3.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(250, 250, 255, ${0.12 + Math.random() * 0.24})`;
    ctx.fill();
    if (r > 1.6) {
      ctx.beginPath();
      ctx.arc(x, y + r * 0.35, r * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(14, 10, 12, 0.28)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();
    }
  }
}

function paintMist(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const banks = Math.round((w * h) / 26000);
  for (let i = 0; i < banks; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 120 + Math.random() * 300;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(240, 242, 248, ${0.05 + Math.random() * 0.08})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function makeBrush(radius: number, dpr: number) {
  const size = Math.ceil(radius * 2 * dpr);
  const brush = document.createElement("canvas");
  brush.width = brush.height = size;
  const ctx = brush.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.55, "rgba(0,0,0,0.85)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return brush;
}

export default function FogGlass({ word, layout = "center", hint }: FogGlassProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const host = wrap?.parentElement;
    if (!wrap || !canvas || !host) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const view = canvas.getContext("2d")!;
    const fog = document.createElement("canvas");
    const fogCtx = fog.getContext("2d")!;
    const mist = document.createElement("canvas");
    const mistCtx = mist.getContext("2d")!;
    const mask = document.createElement("canvas");
    const maskCtx = mask.getContext("2d")!;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let brush: HTMLCanvasElement;
    let fontFamily = "serif";
    let fontSize = 120;
    let textX = 0;
    let textWidth = 0;
    let baseline = 0;
    let frame = 0;
    let raf = 0;
    let visible = false;
    let started = performance.now();
    let wordDripped = false;
    let nextAmbient = 0;
    let last: { x: number; y: number; t: number } | null = null;
    const drips: Drip[] = [];

    const elapsed = () => (performance.now() - started) / 1000;

    const setup = () => {
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      for (const c of [canvas, fog, mask]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      // The mist is 40% wider than the glass so it can drift without showing an edge.
      mist.width = Math.round(w * 1.4 * dpr);
      mist.height = Math.round(h * dpr);
      for (const ctx of [view, fogCtx, maskCtx, mistCtx]) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintFog(fogCtx, w, h);
      paintMist(mistCtx, w * 1.4, h);
      brush = makeBrush(BRUSH_RADIUS, dpr);

      view.font = `400 100px ${fontFamily}`;
      const at100 = view.measureText(word).width;
      if (layout === "baseline") {
        const pad = Math.max(16, w * 0.025);
        fontSize = Math.min(((w - pad * 2) / at100) * 100, h * 0.36);
        textX = pad;
        // Below 1024px the bottom dock covers the last ~96px, so the word sits above it.
        baseline = h - fontSize * 0.18 - (w < 1024 ? 104 : h * 0.04);
      } else {
        fontSize = Math.min(((w * 0.8) / at100) * 100, h * 0.42);
        textX = w / 2;
        baseline = h * 0.5 + fontSize * 0.34;
      }
      textWidth = (fontSize / 100) * at100;
    };

    const stamp = (x: number, y: number, scale = 1) => {
      const size = BRUSH_RADIUS * 2 * scale;
      maskCtx.drawImage(brush, x - size / 2, y - size / 2, size, size);
    };

    const spawnDrip = (x: number, y: number, size = 1) => {
      if (reduce || drips.length >= MAX_DRIPS) return;
      drips.push({
        x,
        y,
        vy: 0.2 + Math.random() * 0.6,
        r: (2 + Math.random() * 2.6) * size,
        life: 140 + Math.random() * 260,
        wobble: Math.random() * Math.PI * 2,
        pause: Math.random() < 0.5 ? 20 + Math.random() * 60 : 0,
      });
    };

    const wipe = (x: number, y: number) => {
      maskCtx.globalCompositeOperation = "source-over";
      const now = performance.now();
      const from = last ?? { x, y, t: now };
      const distance = Math.hypot(x - from.x, y - from.y);
      // A quick swipe is a whole palm; a slow drag is a fingertip.
      const speed = distance / Math.max(8, now - from.t);
      const scale = Math.min(1.5, 0.75 + speed * 0.35);
      const steps = Math.max(1, Math.ceil(distance / 7));
      for (let i = 1; i <= steps; i++) {
        const px = from.x + ((x - from.x) * i) / steps;
        const py = from.y + ((y - from.y) * i) / steps;
        stamp(px, py, scale);
        // Now and then a bead gathers at the bottom edge of the wipe and runs.
        if (Math.random() < 0.02) spawnDrip(px + (Math.random() - 0.5) * BRUSH_RADIUS, py + BRUSH_RADIUS * 0.5 * scale);
      }
      last = { x, y, t: now };
    };

    const wordLeft = () => (layout === "baseline" ? textX : textX - textWidth / 2);

    const drawWord = () => {
      const t = elapsed() - WRITE_START;
      const progress = reduce ? 1 : Math.min(1, Math.max(0, t / WRITE_SECONDS));
      if (progress <= 0) return;
      const eased = progress < 1 ? 1 - Math.pow(1 - progress, 2.4) : 1;
      const left = wordLeft();
      const edge = left + textWidth * eased;

      view.save();
      // A soft leading edge, like a fingertip still moving through the fog.
      const g = view.createLinearGradient(edge - 40, 0, edge + 8, 0);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      view.beginPath();
      view.rect(0, 0, edge + 8, h);
      view.clip();
      view.globalCompositeOperation = "destination-out";
      view.font = `400 ${fontSize}px ${fontFamily}`;
      view.textAlign = layout === "baseline" ? "left" : "center";
      view.textBaseline = "alphabetic";
      view.fillStyle = progress < 1 ? g : "#000";
      if (progress < 1) {
        // Everything behind the fingertip is fully clear; only the last 40px fades.
        view.save();
        view.beginPath();
        view.rect(0, 0, edge - 40, h);
        view.clip();
        view.fillStyle = "#000";
        view.fillText(word, textX, baseline);
        view.restore();
      }
      view.fillText(word, textX, baseline);
      view.restore();

      // Once written, water collects under the letters and a few drops break away.
      if (progress >= 1 && !wordDripped) {
        wordDripped = true;
        const count = Math.round(textWidth / 90);
        for (let i = 0; i < count; i++) {
          spawnDrip(left + Math.random() * textWidth, baseline + fontSize * 0.02, 1.1);
        }
      }
    };

    const drawDrips = () => {
      for (const d of drips) {
        const x = d.x + Math.sin(d.wobble) * 0.8;
        // The drop itself: a dark lens with a bright highlight, refracting what's behind.
        view.beginPath();
        view.ellipse(x, d.y, d.r * 0.9, d.r * 1.15, 0, 0, Math.PI * 2);
        view.fillStyle = "rgba(230, 232, 240, 0.35)";
        view.fill();
        view.beginPath();
        view.ellipse(x, d.y + d.r * 0.35, d.r * 0.65, d.r * 0.7, 0, 0, Math.PI * 2);
        view.fillStyle = "rgba(20, 14, 18, 0.22)";
        view.fill();
        view.beginPath();
        view.ellipse(x - d.r * 0.3, d.y - d.r * 0.4, d.r * 0.32, d.r * 0.42, 0, 0, Math.PI * 2);
        view.fillStyle = "rgba(255,255,255,0.85)";
        view.fill();
      }
    };

    const render = () => {
      frame++;
      const t = elapsed();

      // Drops form on their own once the glass has fogged.
      if (!reduce && t > STEAM_SECONDS + WRITE_SECONDS && t > nextAmbient) {
        spawnDrip(Math.random() * w, Math.random() * h * 0.55, 0.8 + Math.random() * 0.5);
        nextAmbient = t + 0.9 + Math.random() * 1.8;
      }

      if (drips.length) {
        maskCtx.globalCompositeOperation = "source-over";
        for (let i = drips.length - 1; i >= 0; i--) {
          const d = drips[i];
          if (d.pause > 0) {
            d.pause--;
            continue;
          }
          d.y += d.vy;
          d.vy = Math.min(d.vy * 1.012 + 0.004, 2.6);
          d.wobble += 0.08;
          d.life--;
          // Drops sometimes catch on a bead and stop for a beat.
          if (Math.random() < 0.004) d.pause = 10 + Math.random() * 30;
          stamp(d.x + Math.sin(d.wobble) * 0.8, d.y, (d.r * 0.75) / BRUSH_RADIUS);
          if (d.life <= 0 || d.y > h + 10) drips.splice(i, 1);
        }
      }

      if (frame % REGROW_EVERY === 0) {
        maskCtx.globalCompositeOperation = "destination-out";
        maskCtx.fillStyle = `rgba(0,0,0,${REGROW_ALPHA})`;
        maskCtx.fillRect(0, 0, w, h);
      }

      // The glass steams up from clear when it is first seen.
      const steam = reduce ? 1 : Math.min(1, t / STEAM_SECONDS);
      view.globalCompositeOperation = "source-over";
      view.clearRect(0, 0, w, h);
      view.globalAlpha = 1 - Math.pow(1 - steam, 3);
      view.drawImage(fog, 0, 0, w, h);
      const drift = reduce ? 0 : (Math.sin(t * 0.07) * 0.5 + 0.5) * w * 0.4;
      view.globalAlpha *= 0.9 + Math.sin(t * 0.6) * 0.1;
      view.drawImage(mist, -drift, 0, w * 1.4, h);
      view.globalAlpha = 1;
      view.globalCompositeOperation = "destination-out";
      view.drawImage(mask, 0, 0, w, h);
      drawWord();
      view.globalCompositeOperation = "source-over";
      drawDrips();

      if (visible) raf = requestAnimationFrame(render);
    };

    const onMove = (event: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (y < 0 || y > h) return;
      wipe(x, y);
      setTouched(true);
    };
    const onLeave = () => {
      last = null;
    };
    // Phones: pointer events stop once the page starts scrolling, touch events keep coming,
    // so a finger sliding over the glass keeps wiping it while the page scrolls as usual.
    const onTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      const rect = wrap.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      if (y < 0 || y > h) return;
      wipe(x, y);
      setTouched(true);
    };

    let lastSize = { w: 0, h: 0 };
    const resize = new ResizeObserver(() => {
      // Ignore the small height changes from mobile browser bars; they would reset the glass.
      const nw = wrap.clientWidth;
      const nh = wrap.clientHeight;
      if (nw === lastSize.w && Math.abs(nh - lastSize.h) < 120) return;
      lastSize = { w: nw, h: nh };
      setup();
    });

    let firstView = true;
    const io = new IntersectionObserver(([entry]) => {
      const wasVisible = visible;
      visible = entry.isIntersecting;
      if (visible && !wasVisible) {
        // The glass steams up the first time it is seen, not on page load.
        if (firstView) {
          started = performance.now();
          firstView = false;
        }
        raf = requestAnimationFrame(render);
      }
    });

    let cancelled = false;
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-rye").trim();
    if (family) fontFamily = family;

    document.fonts
      .load(`400 100px ${fontFamily}`)
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        lastSize = { w: wrap.clientWidth, h: wrap.clientHeight };
        setup();
        render();
        resize.observe(wrap);
        io.observe(wrap);
        host.addEventListener("pointermove", onMove);
        host.addEventListener("pointerdown", onMove);
        host.addEventListener("pointerleave", onLeave);
        host.addEventListener("pointerup", onLeave);
        host.addEventListener("pointercancel", onLeave);
        host.addEventListener("touchmove", onTouch, { passive: true });
        host.addEventListener("touchend", onLeave, { passive: true });
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      io.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerup", onLeave);
      host.removeEventListener("pointercancel", onLeave);
      host.removeEventListener("touchmove", onTouch);
      host.removeEventListener("touchend", onLeave);
    };
  }, [word, layout]);

  return (
    <div ref={wrapRef} aria-hidden="true" className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {hint && (
        <p
          className={`label pointer-events-none absolute bottom-[42%] right-8 hidden items-center gap-2 rounded-full bg-asphalt/45 px-4 py-2.5 text-chrome/90 backdrop-blur-md transition-opacity duration-1000 ease-leaf md:flex ${
            touched ? "opacity-0" : "opacity-100"
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-neon" />
          </span>
          {hint}
        </p>
      )}
    </div>
  );
}
