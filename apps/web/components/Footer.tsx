import Link from "next/link";

// Site footer. Surfaces the content (Learn + key guides) and legal pages so they
// are reachable from every marketing/content page, which also strengthens
// internal linking for SEO.
const LEARN = [
  { href: "/methodology", label: "How scoring works" },
  { href: "/what-is-geo", label: "What is GEO?" },
  { href: "/how-ai-reads-your-website", label: "How AI reads your site" },
  { href: "/geo-vs-seo", label: "GEO vs SEO" },
  { href: "/glossary", label: "Glossary" },
];

const GUIDES = [
  { href: "/guides/entity-clarity", label: "Entity clarity" },
  { href: "/guides/sourceability", label: "Sourceability" },
  { href: "/guides/structured-data", label: "Structured data" },
  { href: "/learn", label: "All guides" },
];

function Col({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-fg-subtle">
        {title}
      </span>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="flex min-h-[44px] items-center text-sm text-fg-muted hover:text-fg sm:min-h-0"
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
          <Link href="/" className="flex min-h-[44px] items-center gap-2 sm:min-h-0">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: "linear-gradient(120deg, var(--accent), var(--accent-2))" }}
            />
            <span className="font-mono text-sm font-medium tracking-tight">findyouraiscore</span>
          </Link>
          <p className="text-xs text-fg-subtle">Evidence-based, deterministic AI search readiness.</p>
        </div>
        <Col title="Learn" links={LEARN} />
        <Col title="Guides" links={GUIDES} />
        <Col
          title="More"
          links={[
            { href: "/product", label: "Product" },
            { href: "/case-studies", label: "Case study" },
            { href: "/about", label: "About" },
            { href: "/contact", label: "Contact" },
            { href: "/pricing", label: "Pricing" },
            { href: "/imprint", label: "Imprint" },
            { href: "/privacy", label: "Privacy" },
          ]}
        />
      </div>
      <div className="mx-auto max-w-4xl px-6 pb-8">
        <p className="font-mono text-xs text-fg-subtle">
          findyouraiscore · does not measure or guarantee rankings, citations or visibility in AI
          platforms.
        </p>
      </div>
    </footer>
  );
}
