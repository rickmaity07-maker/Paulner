import { appRoute, body } from "@/lib/app-auth";
import { closeTab } from "@/lib/deckel";

type Ctx = { params: Promise<{ id: string }> };

/* POST { action: "close" | "on_account" | "void" | "reopen" } */
export const POST = appRoute<Ctx>(async (request, user, { params }) => closeTab(user, (await params).id, (await body(request)).action));
