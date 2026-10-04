import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { safeNext } from "@/lib/auth";
import { GOOGLE_STATE_COOKIE, isGoogleConfigured, startGoogleLogin } from "@/lib/google";

/* Sends the visitor to Google's account picker. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!isGoogleConfigured()) return NextResponse.redirect(new URL("/login?error=google", url), 303);

  const { url: googleUrl, state, verifier } = startGoogleLogin(url.origin);
  (await cookies()).set(
    GOOGLE_STATE_COOKIE,
    JSON.stringify({ state, verifier, next: safeNext(url.searchParams.get("next")) }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/api/auth/google",
    },
  );
  return NextResponse.redirect(googleUrl, 303);
}
