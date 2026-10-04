import { appRoute } from "@/lib/app-auth";
import { refundPayment } from "@/lib/deckel";

type Ctx = { params: Promise<{ id: string }> };

/* Owners only: takes back a cash or card-terminal payment entered by mistake. */
export const POST = appRoute<Ctx>(async (_request, user, { params }) => refundPayment(user, (await params).id), { owner: true });
