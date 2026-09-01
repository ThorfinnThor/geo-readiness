import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { JsonLd } from "@/components/seo/JsonLd";
import { GLOSSARY, glossaryTerm } from "@/lib/content/glossary";
import { CONTENT } from "@/lib/content/registry";
import { ogImageUrl } from "@/lib/seo/content-metadata";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo/site";

const glossaryMeta = CONTENT.find((c) => c.slug === "/glossary")!;

export function generateStaticParams() {
  return GLOSSARY.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = glossaryTerm(slug);
  if (!t) return {};
  const path = `/glossary/${t.slug}`;
  return {
    title: t.term,
    description: t.def,
    alternates: { canonical: path },
    openGraph: {
      title: t.term,
      description: t.def,
      url: path,
      type: "article",
      images: [ogImageUrl(t.term, "Glossary")],
    },
    twitter: {
      card: "summary_large_image",
      title: t.term,
      description: t.def,
      images: [ogImageUrl(t.term, "Glossary")],
    },
  };
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = glossaryTerm(slug);
  if (!t) notFound();

  const path = `/glossary/${t.slug}`;
  const related = t.related
    .map((s) => glossaryTerm(s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const definedTermJsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": absoluteUrl(path),
    name: t.term,
    description: t.def,
    url: absoluteUrl(path),
    inDefinedTermSet: absoluteUrl("/glossary"),
  };

  return (
    <ArticleLayout
      title={t.term}
      description={t.def}
      category="Glossary"
      updated={glossaryMeta.updated}
      path={path}
    >
      <JsonLd data={definedTermJsonLd} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Glossary", path: "/glossary" },
          { name: t.term, path },
        ])}
      />
      <p>{t.long}</p>

      {related.length > 0 && (
        <>
          <h2>Related terms</h2>
          <ul>
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/glossary/${r.slug}`}>{r.term}</Link>. {r.def}
              </li>
            ))}
          </ul>
        </>
      )}

      <p>
        <Link href="/glossary">Back to the full glossary</Link>
      </p>
    </ArticleLayout>
  );
}
