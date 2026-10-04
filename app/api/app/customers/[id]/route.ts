import { appRoute, body } from "@/lib/app-auth";
import { getCustomer, updateCustomer } from "@/lib/deckel";

type Ctx = { params: Promise<{ id: string }> };

export const GET = appRoute<Ctx>(async (_request, _user, { params }) => getCustomer((await params).id));
export const PATCH = appRoute<Ctx>(async (request, user, { params }) => updateCustomer(user, (await params).id, await body(request)));
