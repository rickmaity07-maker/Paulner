"use client";

import type { PointerEvent, ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { ArrowUpRight } from "@phosphor-icons/react";

interface ButtonLinkProps {
  href: string;
  children: ReactNode;
  variant?: "solid" | "ghost";
  className?: string;
  onClick?: () => void;
}

const VARIANTS = {
  solid: "bg-amber text-chrome hover:bg-route",
  ghost: "bg-chrome/10 text-chrome ring-1 ring-inset ring-chrome/30 backdrop-blur-md hover:bg-chrome hover:text-asphalt",
} as const;

const ICON_VARIANTS = {
  solid: "bg-chrome/15",
  ghost: "bg-chrome/10 group-hover:bg-asphalt/10",
} as const;

/* Pill CTA that leans toward the pointer, with the arrow nested in its own circle. */
export default function ButtonLink({ href, children, variant = "solid", className = "", onClick }: ButtonLinkProps) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 16, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 180, damping: 16, mass: 0.4 });

  const handleMove = (event: PointerEvent<HTMLAnchorElement>) => {
    if (reduce || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * 0.22);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.32);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      href={href}
      onClick={onClick}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{ x: springX, y: springY }}
      className={`group label inline-flex items-center gap-3 whitespace-nowrap rounded-full py-2 pl-6 pr-2 transition-colors duration-500 ease-leaf active:scale-[0.98] ${VARIANTS[variant]} ${className}`}
    >
      {children}
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-500 ease-leaf group-hover:-translate-y-px group-hover:translate-x-1 group-hover:scale-105 ${ICON_VARIANTS[variant]}`}
      >
        <ArrowUpRight size={16} weight="regular" />
      </span>
    </motion.a>
  );
}
