import { ApiError, appRoute, body } from "@/lib/app-auth";
import { allocateItems, getTab, packItems } from "@/lib/deckel";
import { stripe } from "@/lib/stripe";

/*
  POST { tabId, amountCents, tipCents, items? } -> { clientSecret, id }
  Creates the card-present payment the tablet then collects with Tap to Pay.
  The amount is checked against what the tab still owes, on the server.
*/
export const POST = appRoute(async (request, user) => {
  const input = await body(request);
  const tab = await getTab(String(input.tabId ?? ""));
  if (tab.status !== "open" && tab.status !== "on_account") throw new ApiError(409, "tab_not_open");
  // Split bill: the drinks decide the amount.
  const split = input.items !== undefined ? allocateItems(tab, input.items) : null;
  const amount = split ? split.amount : Number(input.amountCents);
  const tip = Number(input.tipCents ?? 0);
  if (!Number.isInteger(amount) || amount < 50 || amount > tab.balanceCents) throw new ApiError(422, "amount_invalid");
  if (!Number.isInteger(tip) || tip < 0 || tip > 100_000) throw new ApiError(422, "tip_invalid");
  const intent = await stripe().paymentIntents.create({
    amount: amount + tip,
    currency: "eur",
    allowed_payment_method_types: ["card_present"],
    capture_method: "automatic",
    description: `Deckel #${tab.number} ${tab.label}`,
    metadata: { tab_id: tab.id, amount_cents: String(amount), tip_cents: String(tip), staff: user.email, ...(split ? packItems(split.lines) : {}) },
  });
  return { id: intent.id, clientSecret: intent.client_secret };
});
