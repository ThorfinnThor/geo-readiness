import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { SITE, absoluteUrl } from "@/lib/seo/site";

// The apex 308-redirects to www in production. A canonical, a sitemap entry or
// a robots Host line naming the apex therefore names a URL that redirects, and
// Search Console files those under "Page with redirect — not indexed". Every
// absolute URL the site emits has to name the host that actually answers 200.
describe("canonical host", () => {
  it("is the host that serves 200, not the one that redirects", () => {
    expect(SITE.url).toBe("https://www.findyouraiscore.com");
    expect(SITE.url).not.toMatch(/^https:\/\/findyouraiscore\.com/);
  });

  it("is used by every sitemap entry, the robots host and the sitemap link", () => {
    for (const entry of sitemap()) expect(entry.url.startsWith(`${SITE.url}/`)).toBe(true);
    const r = robots();
    expect(r.host).toBe(SITE.url);
    expect(r.sitemap).toBe(absoluteUrl("/sitemap.xml"));
  });
});
