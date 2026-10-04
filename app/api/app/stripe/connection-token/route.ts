import { appRoute } from "@/lib/app-auth";
import { getSite } from "@/lib/store";
import { stripe, stripeMode, terminalLocation } from "@/lib/stripe";

/* The Terminal SDK on the tablet asks for a fresh connection token whenever it connects a reader. */
export const POST = appRoute(async () => {
  const { venue } = await getSite();
  const location = await terminalLocation(venue);
  const token = await stripe().terminal.connectionTokens.create({ location });
  return { secret: token.secret, location, mode: stripeMode() };
});
