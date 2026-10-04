import "server-only";
import Stripe from "stripe";
import { ApiError } from "@/lib/app-auth";

/*
  Stripe Terminal for Tap to Pay on Android: the tablet itself reads the card.
  STRIPE_SECRET_KEY decides the mode: sk_test_… for testing with the simulated
  reader, sk_live_… once the bar has its own activated Stripe account.
*/
let client: Stripe | null = null;

export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);
export const stripeMode = () => (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test");

export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new ApiError(503, "stripe_not_configured");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

const LOCATION_NAME = "Paulaner Meets Route 66";

/* Tap to Pay readers register to a Terminal location; the bar has exactly one, created on first use. */
export async function terminalLocation(address: { street: string; city: string }) {
  if (process.env.STRIPE_TERMINAL_LOCATION) return process.env.STRIPE_TERMINAL_LOCATION;
  const s = stripe();
  const existing = await s.terminal.locations.list({ limit: 100 });
  const found = existing.data.find((l) => l.display_name === LOCATION_NAME);
  if (found) return found.id;
  const [postal, ...town] = address.city.split(" ");
  const created = await s.terminal.locations.create({
    display_name: LOCATION_NAME,
    address: { line1: address.street, postal_code: postal, city: town.join(" ") || postal, country: "DE" },
  });
  return created.id;
}
