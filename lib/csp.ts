/*
  Content Security Policy for every page. Scripts run only with this request's
  nonce (Next adds it to its own), and 'strict-dynamic' lets those load the
  site's other chunks. An injected <script> has no nonce and is refused.

  - img-src https:  the portal accepts photo links from any https host
  - style-src 'unsafe-inline'  React renders style="" attributes; styles cannot run code
  - form-action Google  the "Sign in with Google" redirect
  - 'unsafe-eval' only in development, where React needs it for error overlays
*/
export function contentSecurityPolicy(nonce: string, dev = false) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
    // No upgrade-insecure-requests: HSTS already keeps the live site on https, and it would break http://localhost tests.
  ].join("; ");
}
