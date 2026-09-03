import { JsonLd } from "@/components/seo/JsonLd";

export interface Faq {
  q: string;
  a: string;
}

/**
 * Visible Q&A plus the matching FAQPage structured data, emitted together so the
 * schema can never claim an answer the page does not show — the contradiction
 * that costs more trust than the missing markup would have.
 */
export function FaqSection({
  faqs,
  heading = "Frequently asked questions",
}: {
  faqs: Faq[];
  heading?: string;
}) {
  if (faqs.length === 0) return null;
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2>
      <dl className="flex flex-col divide-y divide-border">
        {faqs.map((f) => (
          <div key={f.q} className="flex flex-col gap-2 py-4">
            <dt className="font-medium">{f.q}</dt>
            <dd className="text-fg-muted">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
