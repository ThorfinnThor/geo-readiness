import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";
import { contentMetadata } from "@/lib/seo/content-metadata";

const meta = CONTENT.find((c) => c.slug === "/guides/technical-accessibility")!;

export const metadata = contentMetadata(meta.slug);

export default function Page() {
  return (
    <ArticleLayout
      title="Technical Accessibility. Make sure machines can read your site at all"
      description="The best content is worthless if a machine cannot fetch or read it. Here is how to make sure your pages are reachable, server-visible and not accidentally blocking AI."
      category="Guide"
      updated={meta.updated}
      path={meta.slug}
      faqs={[
        {
          q: "What does server-visible content mean?",
          a: "It is the text that is present in the page as delivered, before any scripts run. AI crawlers often read that raw version. If your real content only appears after heavy JavaScript, the machine may see an almost empty page even though your browser shows a full one.",
        },
        {
          q: "How would I be accidentally blocking AI?",
          a: "A robots.txt rule, an over-aggressive bot filter, or a firewall setting can block automated visitors. Sometimes a security product blocks everything that is not a mainstream browser. Then your pages return errors to crawlers and score zero, not because of content, but because of access.",
        },
        {
          q: "Do I need my site to be lightning fast?",
          a: "It helps, but the bigger wins here are reachability and server-visible content. A reasonably fast, reachable page with its text present beats a beautiful page that a crawler cannot load or read.",
        },
      ]}
    >
      <p>
        Technical accessibility is the foundation everything else sits on. Can a machine actually
        fetch and read your pages? It sounds obvious, yet it is where some sites silently score zero.
        The content is great, but a crawler never gets to it.
      </p>

      <h2>The three things that go wrong</h2>
      <ol>
        <li>
          <strong>The page is blocked.</strong> A robots rule, a bot filter or a security product
          returns an error to anything that is not a mainstream browser. The crawler gets nothing.
        </li>
        <li>
          <strong>The content is not server-visible.</strong> Your headline, prices and copy are
          built by scripts after the page loads. Your browser runs them. Many crawlers read the raw
          page and see an empty shell.
        </li>
        <li>
          <strong>The structure is missing.</strong> There is no clear title, headings or links, so
          even when the text is read, the machine cannot tell what is important.
        </li>
      </ol>

      <h2>How to fix it</h2>
      <ol>
        <li>
          <strong>Check that your key content is in the page source.</strong> View the raw HTML, or
          disable JavaScript, and confirm your headline, main copy and prices are actually there. If
          not, your site needs server-side rendering or static content for those parts.
        </li>
        <li>
          <strong>Review robots.txt.</strong> Make sure you are not disallowing your important pages.
          Blocking admin areas is fine. Blocking your content is not.
        </li>
        <li>
          <strong>Do not over-block bots.</strong> Aggressive block all non-browser traffic settings
          can lock out legitimate crawlers. Allow well-behaved ones to read public pages.
        </li>
        <li>
          <strong>Use real HTML structure</strong>, with one clear page title, proper headings and
          real links. This is how a machine understands the shape of your page.
        </li>
        <li>
          <strong>Keep pages reasonably fast and reliable.</strong> Timeouts and errors mean missed
          pages.
        </li>
      </ol>

      <h2>Why this is the first thing to check</h2>
      <p>
        If a machine cannot reach or read a page, none of the other work, meaning clarity, quotable
        content and trust, even gets a chance. It is the cheapest, highest-leverage fix. Get access
        right first, then improve what is on the page.
      </p>

      <p>
        A free readiness scan fetches your site exactly as an AI crawler would and reports what it
        could actually reach and read, including pages that came back blocked or empty.
      </p>

      <h2>A related but separate check</h2>
      <p>
        Reachability is one lens on your public surface. The wider health of that same surface,
        things like security headers, code quality and how original your frontend really is, sits
        outside a readiness score. If you want a read on that side, we build a sibling tool,{" "}
        <a href="https://vibefootprint.com" target="_blank" rel="noopener">
          VibeFootprint
        </a>
        , that scans the public surface of a site with the same evidence-led, deterministic approach
        and scores its code and security footprint.
      </p>
    </ArticleLayout>
  );
}
