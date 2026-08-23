import type { Metadata } from "next";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";

const meta = CONTENT.find((c) => c.slug === "/guides/structured-data")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.slug },
  openGraph: { title: meta.title, description: meta.description, url: meta.slug, type: "article" },
};

export default function Page() {
  return (
    <ArticleLayout
      title="Structured Data: stop making machines guess"
      description="Structured data spells out your facts in a machine-readable format so AI does not have to guess who you are. A plain-language guide to adding it — no coding degree required."
      category="Guide"
      updated={meta.updated}
      path={meta.slug}
      faqs={[
        {
          q: "Is structured data the same as SEO keywords?",
          a: "No. Keywords are the visible words on your page. Structured data is a small block of labels in the page's code that states facts explicitly — your name, address, prices, an FAQ — in a format machines read directly, without interpretation.",
        },
        {
          q: "Do I need a developer to add it?",
          a: "Often not for the basics. Most website builders and CMS platforms have a plugin or a settings field for it, and there are free generators for the common types. For custom sites, it is a small, well-documented addition a developer can do quickly.",
        },
        {
          q: "Which types should a small business start with?",
          a: "Organization (or LocalBusiness) for your identity and contact details, and FAQPage for your common questions. Those two cover the most valuable ground. Add Product or Service markup if you sell specific, listable items.",
        },
      ]}
    >
      <p>
        <strong>Structured data</strong> is a small set of labels in your page&apos;s code that
        state your facts in a way machines read without guessing. Instead of hoping an AI correctly
        infers that &quot;BrightSolar&quot; is your business name and &quot;Austin&quot; is your
        city, you <em>tell</em> it, explicitly. It removes ambiguity — which is exactly what makes
        you eligible for specific answers.
      </p>

      <h2>What it looks like (conceptually)</h2>
      <p>
        You do not need to read code to get the idea. Structured data is like filling in a form the
        machine can read:
      </p>
      <ul>
        <li>Type: Organization</li>
        <li>Name: BrightSolar</li>
        <li>City: Austin, TX</li>
        <li>Phone / email / opening hours: …</li>
      </ul>
      <p>
        Google uses it for rich results (stars, FAQs, business info), and AI systems use it as a
        clean, trustworthy statement of the facts — no interpretation required.
      </p>

      <h2>The types worth having</h2>
      <ol>
        <li>
          <strong>Organization / LocalBusiness</strong> — your identity: name, URL, address,
          contact, hours. The single highest-value piece for most businesses.
        </li>
        <li>
          <strong>FAQPage</strong> — marks your common questions and answers so they are recognized
          as clean, extractable Q&amp;A.
        </li>
        <li>
          <strong>Product / Service</strong> — if you sell specific, listable things, mark up name,
          description and price.
        </li>
        <li>
          <strong>Breadcrumb</strong> — helps machines understand where a page sits in your site.
        </li>
      </ol>

      <h2>How to add it</h2>
      <ol>
        <li>
          <strong>On a website builder / CMS:</strong> look for a built-in SEO/schema setting or a
          plugin (most platforms have one). Fill in your business details once.
        </li>
        <li>
          <strong>Use a free generator</strong> for the JSON-LD snippet of the type you need, then
          paste it into the page&apos;s head — or hand it to your developer.
        </li>
        <li>
          <strong>Keep it truthful and consistent</strong> with what&apos;s visible on the page.
          Structured data that contradicts the page is worse than none.
        </li>
        <li>
          <strong>Validate it</strong> with a free structured-data testing tool to catch mistakes.
        </li>
      </ol>

      <p>
        A caution: structured data states facts, it does not create them. It works <em>with</em>{" "}
        clear on-page content, not instead of it. A free readiness scan checks whether your
        structured data is present and complete — and flags where it is missing.
      </p>
    </ArticleLayout>
  );
}
