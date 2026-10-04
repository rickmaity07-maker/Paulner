import { appRoute, body } from "@/lib/app-auth";
import { addItems } from "@/lib/deckel";

type Ctx = { params: Promise<{ id: string }> };

/* POST { items: [{ drinkId, qty }], payNow?: { method, tipCents } } */
export const POST = appRoute<Ctx>(async (request, user, { params }) => addItems(user, (await params).id, await body(request)));
