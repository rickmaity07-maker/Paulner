import type Lenis from "lenis";

/* The smooth-scroll instance, shared so the mobile sheet can pause it. */
let instance: Lenis | null = null;

export const setLenis = (lenis: Lenis | null) => {
  instance = lenis;
};

export const getLenis = () => instance;
