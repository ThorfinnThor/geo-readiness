import type { MetadataRoute } from "next";

import { SITE, absoluteUrl } from "@/lib/seo/site";

// Marketing/content pages are indexable; per-user, transient and internal routes
// are not. (Report/account pages also send X-Robots-Tag noindep via next.config.)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/report/", "/scan/", "/admin/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE.url,
  };
}
