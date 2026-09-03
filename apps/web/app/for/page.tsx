import Link from "next/link";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { JsonLd } from "@/components/seo/JsonLd";
import { SEGMENTS } from "@/lib/content/segments";
import { CONTENT } from "@/lib/content/registry";
import { contentMetadata } from "@/lib/seo/content-metadata";
import { absoluteUrl } from "@/lib/seo/site";

const meta = CONTENT.find((c) => c.slug === "/for")!;

export const metadata = contentMetadata(meta.slug);

// ItemList makes the hub itself extractable: an engine reading this page gets
// the set of archetypes and their addresses, not a wall of anchors to guess at.
const listJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: meta.title,
  url: absoluteUrl("/for"),
  itemListElement: SEGMENTS.map((s, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: s.title,
    url: absoluteUrl(`/for/${s.slug}`),
  })),
};

export default function Page() {
  return (
    <ArticleLayout
      title={meta.title}
      description={meta.description}
      category="Reference"
      updated={meta.updated}
      path={meta.slug}
    >
      <JsonLd data={listJsonLd} />
      <p>
        The audit does not ask every website the same questions. It works out what kind of site it
        is reading — from its schema, its offers and its structure — and generates the questions
        that kind of business is actually asked. A comparison site gets category decisions; a local
        business gets questions with a place in them; a one-pager gets asked about its subject.
      </p>
      <p>
        These pages set out what that means for each archetype: the questions, what the audit reads
        to recognise the type, and the failure modes that show up again and again in real scans.
      </p>
      {SEGMENTS.map((s) => (
        <div key={s.slug}>
          <h2 id={s.slug}>
            <Link href={`/for/${s.slug}`}>{s.title}</Link>
          </h2>
          <p>{s.description}</p>
        </div>
      ))}
    </ArticleLayout>
  );
}
