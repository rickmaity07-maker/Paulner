"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";

/*
  Motion follows the visitor's reduced-motion setting on its own: transforms snap,
  fades stay. Components therefore never branch their markup on that setting,
  which keeps the server and client render identical.
*/
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
