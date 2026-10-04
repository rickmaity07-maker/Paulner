import { ApiError, appRoute, body } from "@/lib/app-auth";
import { addPayment } from "@/lib/deckel";

type Ctx = { params: Promise<{ id: string }> };

/*
  POST { amountCents, tipCents, method: cash | card_terminal | other }, or with items: [{ itemId, qty }]
  to pay for particular drinks (the server then works out the amount). Tap to Pay goes through /api/app/stripe.
*/
export const POST = appRoute<Ctx>(async (request, user, { params }) => {
  const input = await body(request);
  if (input.method === "tap_to_pay") throw new ApiError(422, "use_stripe_endpoint");
  return addPayment(user, (await params).id, input);
});
