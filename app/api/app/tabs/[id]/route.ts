import { appRoute, body } from "@/lib/app-auth";
import { getTab, updateTab } from "@/lib/deckel";

type Ctx = { params: Promise<{ id: string }> };

export const GET = appRoute<Ctx>(async (_request, _user, { params }) => getTab((await params).id));
export const PATCH = appRoute<Ctx>(async (request, user, { params }) => updateTab(user, (await params).id, await body(request)));
