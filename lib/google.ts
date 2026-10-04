import "server-only";
import { createHash, randomBytes } from "node:crypto";

/*
  "Sign in with Google" through Google's standard OAuth 2.0 web flow, with
  PKCE. Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from a free OAuth
  client in Google Cloud Console; the button stays hidden until both are set.
*/

export const GOOGLE_STATE_COOKIE = "google_oauth";

export const isGoogleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/* Must match an "Authorized redirect URI" on the OAuth client exactly. */
export const callbackUrl = (origin: string) => `${origin}/api/auth/google/callback`;

const base64url = (buffer: Buffer) => buffer.toString("base64url");

export function startGoogleLogin(origin: string) {
  const state = base64url(randomBytes(24));
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: callbackUrl(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), state, verifier };
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
}

/* Swaps the one-time code for tokens, then asks Google who signed in. */
export async function finishGoogleLogin(origin: string, code: string, verifier: string): Promise<GoogleProfile | null> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: callbackUrl(origin),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!tokenResponse.ok) {
    console.error("Google token exchange failed:", tokenResponse.status, await tokenResponse.text());
    return null;
  }
  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token?: string };
  if (!accessToken) return null;

  const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userResponse.ok) return null;
  const user = (await userResponse.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
  // Only an address Google has verified may sign in to, or be linked with, an account.
  if (!user.sub || !user.email || user.email_verified !== true) return null;
  return { sub: user.sub, email: user.email.toLowerCase(), name: user.name ?? "" };
}
