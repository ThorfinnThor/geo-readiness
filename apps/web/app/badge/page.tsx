import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { CopyPromptButton } from "@/components/report/CopyPromptButton";
import { JsonLd } from "@/components/seo/JsonLd";
import { TopBar } from "@/components/TopBar";
import { ogImageUrl } from "@/lib/seo/content-metadata";
import { SITE, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo/site";

const TITLE = "The readiness badge";
const DESC =
  "A small badge for sites that have run the audit. It states that the site was audited for AI " +
  "search readiness and links back to the tool. No score, no certification, no claims.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/badge" },
  openGraph: { title: TITLE, description: DESC, url: "/badge", images: [ogImageUrl(TITLE)] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

function snippet(variant: "light" | "dark"): string {
  const file = variant === "dark" ? "badge-dark.svg" : "badge.svg";
  return [
    `<a href="${SITE.url}/?utm_source=badge" rel="noopener">`,
    `  <img src="${absoluteUrl(`/${file}`)}"`,
    `       alt="AI search readiness audited by ${SITE.shortName}.com"`,
    `       width="240" height="44" loading="lazy">`,
    `</a>`,
  ].join("\n");
}

function Variant({ variant }: { variant: "light" | "dark" }) {
  const code = snippet(variant);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/50 p-5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium capitalize">{variant}</span>
        <CopyPromptButton text={code} label="Copy embed code" />
      </div>
      <div
        className="flex items-center justify-center rounded-lg p-5"
        style={{ background: variant === "dark" ? "#0b1120" : "#ffffff" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={variant === "dark" ? "/badge-dark.svg" : "/badge.svg"}
          alt={`AI search readiness badge, ${variant} variant`}
          width={240}
          height={44}
        />
      </div>
      <pre className="overflow-x-auto rounded-lg border border-border bg-surface-2/60 p-4 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function BadgePage() {
  return (
    <>
      <TopBar />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Badge", path: "/badge" },
        ])}
      />
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12 sm:py-16">
        <header className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            Resources
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{TITLE}</h1>
          <p className="text-lg text-fg-muted">{DESC}</p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight">What it claims, and what it does not</h2>
          <p className="text-fg-muted">
            The badge says one true thing: this site has been audited for AI search readiness. It
            deliberately shows no score and no seal. A number on a badge goes stale the day you
            change a page, and a seal would imply a certification nobody has issued. If you want to
            publish your score, publish it in your own words next to a link to your report — that is
            a claim you can stand behind because you can point at the evidence.
          </p>
          <p className="text-fg-muted">
            Use it only if you have actually run a scan. That is the whole condition.
          </p>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="text-xl font-semibold tracking-tight">Take the code</h2>
          <Variant variant="light" />
          <Variant variant="dark" />
        </section>

        <section className="flex flex-col gap-4 border-t border-border pt-8">
          <h2 className="text-xl font-semibold tracking-tight">Where to put it</h2>
          <p className="text-fg-muted">
            The footer is the usual home, next to the other things you are willing to be judged on.
            Some people put it on an about or a transparency page instead, with a sentence about
            what they had audited and what they changed as a result. That version is worth more to a
            reader, and to a model reading the page, than a badge on its own.
          </p>
          <p className="text-fg-muted">
            Haven&rsquo;t run one yet? <Link href="/">Start with a free scan</Link>. Everything the
            audit checks is set out in <Link href="/methodology">how scoring works</Link>.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
