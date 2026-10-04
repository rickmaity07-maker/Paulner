import { getSession } from "@/lib/auth";

/* Lets the prerendered pages find out who is signed in and with which role. */
export async function GET() {
  const session = await getSession();
  return Response.json(
    { user: session },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
