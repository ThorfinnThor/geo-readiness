import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { TopBar } from "@/components/TopBar";
import { ogImageUrl } from "@/lib/seo/content-metadata";
import { SITE } from "@/lib/seo/site";

const CONTACT_DESC =
  "Get in touch with Find Your AI Score. Reach us by email for support, feedback about your " +
  "report, or press and partnership enquiries.";

export const metadata: Metadata = {
  title: "Contact",
  description: CONTACT_DESC,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact",
    description: CONTACT_DESC,
    url: "/contact",
    type: "website",
    images: [ogImageUrl("Contact")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact",
    description: CONTACT_DESC,
    images: [ogImageUrl("Contact")],
  },
};

const REASONS: [string, string][] = [
  ["Support", "Something went wrong with a scan or your report, or a charge you did not expect."],
  ["Feedback", "A score that looks off, a finding you disagree with, or a feature you want."],
  ["Press and partnerships", "Coverage, integrations, or working together."],
];

export default function ContactPage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12 sm:py-16">
        <header className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            Contact
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Get in touch</h1>
          <p className="max-w-2xl text-lg text-fg-muted">
            The fastest way to reach us is by email. We read every message and reply to genuine
            questions, usually within a couple of working days.
          </p>
          <a
            href={`mailto:${SITE.email}`}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-fg)] transition-opacity hover:opacity-90"
          >
            {SITE.email}
          </a>
        </header>

        <section className="flex flex-col gap-6 border-t border-border pt-10">
          <h2 className="text-2xl font-semibold tracking-tight">What to reach out about</h2>
          <div className="grid gap-x-10 gap-y-5 sm:grid-cols-3">
            {REASONS.map(([name, desc]) => (
              <div key={name} className="flex flex-col gap-1">
                <span className="font-medium">{name}</span>
                <span className="text-sm text-fg-muted">{desc}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2 border-t border-border pt-10">
          <h2 className="text-xl font-semibold tracking-tight text-fg-muted">Company details</h2>
          <p className="text-sm text-fg-subtle">
            For the operator, legal name and address, see the{" "}
            <Link href="/imprint" className="text-[color:var(--accent)] hover:underline">
              imprint
            </Link>
            . For how we handle data, see the{" "}
            <Link href="/privacy" className="text-[color:var(--accent)] hover:underline">
              privacy policy
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
