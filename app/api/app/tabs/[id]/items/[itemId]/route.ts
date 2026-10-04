import { appRoute, body } from "@/lib/app-auth";
import { changeItem } from "@/lib/deckel";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

/* PATCH { action: "void", reason } | { action: "on_house" | "charge" } | { action: "qty", qty } */
export const PATCH = appRoute<Ctx>(async (request, user, { params }) => {
  const { id, itemId } = await params;
  return changeItem(user, id, itemId, await body(request));
});
