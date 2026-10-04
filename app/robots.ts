import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/* Search engines may read the public pages; the portal, profiles and APIs stay out. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/profile", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
