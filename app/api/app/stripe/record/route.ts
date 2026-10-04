import { ApiError, appRoute, body } from "@/lib/app-auth";
import { db } from "@/lib/db";
import { addPayment, getTab, unpackItems } from "@/lib/deckel";
import { stripe } from "@/lib/stripe";

/*
  POST { paymentIntentId } after the tablet finished Tap to Pay.
  The payment only counts once Stripe itself says it succeeded, and the same
  intent can never be booked twice.
*/
export const POST = appRoute(async (request, user) => {
  const { paymentIntentId } = await body<{ paymentIntentId?: string }>(request);
  if (!paymentIntentId || !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) throw new ApiError(422, "payment_intent_invalid");
  const intent = await stripe().paymentIntents.retrieve(paymentIntentId);
  if (intent.status !== "succeeded") throw new ApiError(409, "payment_not_succeeded", intent.status);
  const tabId = intent.metadata.tab_id;
  if (!tabId) throw new ApiError(422, "payment_intent_foreign");
  const [already] = (await db()`select id from payments where stripe_payment_intent = ${paymentIntentId}`) as unknown[];
  if (already) return getTab(tabId);
  return addPayment(
    user,
    tabId,
    {
      method: "tap_to_pay",
      amountCents: Number(intent.metadata.amount_cents),
      tipCents: Number(intent.metadata.tip_cents ?? 0),
      note: "Tap to Pay",
      items: unpackItems(intent.metadata),
    },
    paymentIntentId,
  );
});
