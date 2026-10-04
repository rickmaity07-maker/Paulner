/* The public address of the site, for robots.txt, the sitemap and link previews. */
export const SITE_URL = (process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://paulaner-teal.vercel.app")).replace(/\/$/, "");
