import { appRoute, body } from "@/lib/app-auth";
import { settleCustomer } from "@/lib/deckel";

type Ctx = { params: Promise<{ id: string }> };

/* POST { amountCents, method } pays down what the guest owes, oldest tab first. */
export const POST = appRoute<Ctx>(async (request, user, { params }) => settleCustomer(user, (await params).id, await body(request)));
