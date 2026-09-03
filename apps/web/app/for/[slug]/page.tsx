import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { SEGMENTS, segment } from "@/lib/content/segments";
import { ogImageUrl } from "@/lib/seo/content-metadata";

export function generateStaticParams() {
  return SEGMENTS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = segment(slug);
  if (!s) return {};
  const path = `/for/${s.slug}`;
  const image = ogImageUrl(s.title, "By site type");
  return {
    title: s.title,
    description: s.description,
    alternates: { canonical: path },
    openGraph: {
      title: s.title,
      description: s.description,
      url: path,
      type: "article",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: s.title,
      description: s.description,
      images: [image],
    },
  };
}

export default async function SegmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = segment(slug);
  if (!s) notFound();

  const path = `/for/${s.slug}`;
  const others = SEGMENTS.filter((o) => o.slug !== s.slug);

  return (
    <ArticleLayout
      title={s.title}
      description={s.description}
      category="By site type"
      updated={s.updated}
      path={path}
      faqs={s.faqs}
      parent={{ name: "By site type", path: "/for" }}
    >
      <p>{s.intro}</p>

      <h2>The questions the engine generates</h2>
      <p>
        These are the shapes of question the audit builds from your own business profile, then
        checks your pages against. Yours are generated from your site, in your site&rsquo;s
        language.
      </p>
      <ul>
        {s.questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ul>

      <h2>What the audit reads to recognise this</h2>
      <ul>
        {s.reads.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <h2>What usually goes wrong</h2>
      {s.pitfalls.map((p) => (
        <div key={p.h}>
          <h3>{p.h}</h3>
          <p>{p.p}</p>
        </div>
      ))}

      <h2>Other site types</h2>
      <ul>
        {others.map((o) => (
          <li key={o.slug}>
            <Link href={`/for/${o.slug}`}>{o.title}</Link>. {o.description}
          </li>
        ))}
      </ul>

      <p>
        The seven signals behind the score are explained in <Link href="/methodology">how scoring
        works</Link>, and each one has a <Link href="/learn">guide of its own</Link>.
      </p>
    </ArticleLayout>
  );
}
