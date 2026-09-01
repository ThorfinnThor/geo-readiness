import Link from "next/link";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { JsonLd } from "@/components/seo/JsonLd";
import { GLOSSARY } from "@/lib/content/glossary";
import { CONTENT } from "@/lib/content/registry";
import { contentMetadata } from "@/lib/seo/content-metadata";
import { absoluteUrl } from "@/lib/seo/site";

const meta = CONTENT.find((c) => c.slug === "/glossary")!;

export const metadata = contentMetadata(meta.slug);

// DefinedTermSet is the schema built for a glossary: each term is an addressable,
// extractable definition an AI engine can lift — the sourceability signal the
// audit itself scores. Each term now has its own page, so the schema points there.
const glossaryJsonLd = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  name: "GEO and AI search glossary",
  url: absoluteUrl("/glossary"),
  hasDefinedTerm: GLOSSARY.map((t) => ({
    "@type": "DefinedTerm",
    "@id": absoluteUrl(`/glossary/${t.slug}`),
    name: t.term,
    description: t.def,
    url: absoluteUrl(`/glossary/${t.slug}`),
    inDefinedTermSet: absoluteUrl("/glossary"),
  })),
};

export default function Page() {
  return (
    <ArticleLayout
      title="GEO and AI search glossary"
      description="Clear, jargon-free definitions of the terms behind AI search readiness, from answer extraction to structured data, so the rest of it actually makes sense."
      category="Reference"
      updated={meta.updated}
      path={meta.slug}
    >
      <JsonLd data={glossaryJsonLd} />
      <p>
        The world of AI search comes with its own vocabulary. Here are the terms that matter,
        explained in plain language for business owners, with no computer-science degree required.
        Each term has its own page with a fuller explanation.
      </p>
      {GLOSSARY.map((t) => (
        <div key={t.slug}>
          <h2 id={t.slug}>
            <Link href={`/glossary/${t.slug}`}>{t.term}</Link>
          </h2>
          <p>{t.def}</p>
        </div>
      ))}
    </ArticleLayout>
  );
}
