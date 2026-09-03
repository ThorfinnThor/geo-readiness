import Link from "next/link";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";
import { contentMetadata } from "@/lib/seo/content-metadata";

const meta = CONTENT.find((c) => c.slug === "/faq")!;

export const metadata = contentMetadata(meta.slug);

// Straight answers to what people actually ask before running a scan, including
// the uncomfortable ones. ArticleLayout renders these as FAQPage structured
// data, which is the cleanest extractable form an answer engine can read.
const FAQS = [
  {
    q: "What does Find Your AI Score actually do?",
    a: "It reads your website the way an AI answer engine does, scores seven readiness signals from what it finds, and returns a 0 to 100 score with the evidence behind every point. The free result is the score and the component breakdown; the paid audit adds every finding with its evidence, a prioritised fix for each, and a downloadable report.",
  },
  {
    q: "Does it query ChatGPT or Claude to see if they mention me?",
    a: "No, and that is deliberate. Answer engines are non-deterministic: ask the same question twice and you can get two different answers, so a single check proves very little and cannot be reproduced. The audit measures readiness — whether your site can be fetched, understood, trusted and quoted — which is stable and which you can act on. The citation self-test then hands you the prompts to run the live check yourself.",
  },
  {
    q: "Is the score a prediction of traffic or rankings?",
    a: "No. It is a diagnostic of your site's readiness as a source. No tool controls what an AI system says, and anyone promising you mentions is selling something they cannot deliver.",
  },
  {
    q: "How long does a scan take?",
    a: "Usually a couple of minutes. The crawler reads a bounded set of your pages, and the scoring runs on rules rather than model calls, so there is no queue behind a third-party API.",
  },
  {
    q: "Will running a scan slow down my website?",
    a: "No. The crawler fetches a limited number of pages at a polite rate and respects robots.txt, like any well-behaved bot.",
  },
  {
    q: "Do I need an account to get a score?",
    a: "No. Enter a domain and you get the free score without signing up. An account only comes in if you buy the full audit.",
  },
  {
    q: "What is the AI Citation Self-Test?",
    a: "A set of neutral questions generated from your own business profile, plus two ready-made prompts. You paste the first into ChatGPT or Claude to run a blind search, and the second to check whether your domain was among the sources. It is deliberately blind: the target domain does not appear in the measurement prompt, so the model finds you on its own rather than being told to.",
  },
  {
    q: "Why are my questions in German (or English)?",
    a: "The engine generates every question of a scan in the language most of your pages are written in, so the questions match how your customers would actually ask. If a multilingual site is being read in the wrong language, the report says so.",
  },
  {
    q: "Is the score reproducible?",
    a: "Yes. The same site, the same crawl and the same methodology version produce the same score. The rules are versioned and there is no model in the scoring path, which is what makes a re-scan after fixes meaningful.",
  },
  {
    q: "Can I re-scan after I fix things?",
    a: "Yes, and that is the point. Because scoring is deterministic, a change in your score after a fix is a real change in your site, not noise.",
  },
  {
    q: "What does it cost?",
    a: "The score, all seven component scores and the confidence rating are free. The full audit is a one-off payment per report — no subscription. Current pricing is on the pricing page.",
  },
  {
    q: "Who is behind this?",
    a: "It is operated from Berlin by SeitenHafen361 (Schayan Yousefian). Contact details and the legal imprint are linked in the footer of every page.",
  },
];

export default function Page() {
  return (
    <ArticleLayout
      title={meta.title}
      description={meta.description}
      category="Reference"
      updated={meta.updated}
      path={meta.slug}
      faqs={FAQS}
    >
      <p>
        Straight answers about what the audit measures, what it deliberately does not, and how to
        read the result. If something you need is missing, <Link href="/contact">ask us</Link> and
        the answer will end up on this page.
      </p>
      <p>
        For the mechanics of the score itself, see <Link href="/methodology">how scoring works</Link>
        . For what the audit checks on your kind of site, see{" "}
        <Link href="/for">readiness by site type</Link>.
      </p>
    </ArticleLayout>
  );
}
