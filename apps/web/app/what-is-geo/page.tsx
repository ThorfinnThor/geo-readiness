import type { Metadata } from "next";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";

const meta = CONTENT.find((c) => c.slug === "/what-is-geo")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.slug },
  openGraph: { title: meta.title, description: meta.description, url: meta.slug, type: "article" },
};

export default function Page() {
  return (
    <ArticleLayout
      title="What is GEO? AI Search Readiness explained"
      description="GEO stands for Generative Engine Optimization. It means making your website easy for AI answer engines to find, trust and quote. Here is what that means for your business, in plain language."
      category="Explainer"
      updated={meta.updated}
      path={meta.slug}
      faqs={[
        {
          q: "Is GEO the same as SEO?",
          a: "No. SEO aims to rank your page in a list of blue links. GEO aims to get your facts quoted inside an AI-generated answer. They share good habits like clear content, fast pages and real information, but the goal is different. Many sites need both.",
        },
        {
          q: "Do I need GEO if I already do SEO?",
          a: "Increasingly, yes. More people now ask ChatGPT, Gemini or Perplexity a question instead of scrolling search results. If those tools cannot cleanly read and trust your pages, they answer using a competitor's information instead of yours.",
        },
        {
          q: "Can GEO guarantee that ChatGPT will mention my business?",
          a: "No, and be wary of anyone who promises that. No tool controls what an AI system says. GEO improves the odds by making your pages readable, trustworthy and quotable. Our audit measures that readiness. It does not measure or guarantee actual mentions.",
        },
        {
          q: "How do I know if my site is ready?",
          a: "Run a free readiness scan. It reads your pages the way an AI system would, scores seven areas from how clearly your business is identified to how quotable your content is, and shows exactly what to improve.",
        },
      ]}
    >
      <p>
        A growing share of your customers no longer type a question into Google and scroll through
        links. They ask <strong>ChatGPT, Gemini or Perplexity</strong> and get a single written
        answer. That answer is built from information those systems pulled from websites. The
        question for your business is simple. <strong>Is your website one of the sites they pull
        from, or is a competitor&apos;s?</strong>
      </p>
      <p>
        GEO stands for Generative Engine Optimization. It is the work of making your website easy
        for those AI answer engines to find, understand, trust and quote. Think of it as making your
        business legible to machines that summarize the web for people.
      </p>

      <h2>Why this is happening now</h2>
      <p>
        Search is shifting from ten blue links toward a single written answer. When someone asks an
        AI assistant <em>&quot;who installs solar panels in my city?&quot;</em> or{" "}
        <em>&quot;what&apos;s the best accounting tool for a small shop?&quot;</em>, the assistant
        writes a recommendation. If your site is clear and credible, your business can be part of
        that recommendation. If your site is confusing to a machine, even when it looks great to a
        human, you are invisible in exactly the moment a customer is deciding.
      </p>

      <h2>What AI answer engines are actually looking for</h2>
      <p>
        These systems do not see your beautiful design. They read the underlying text and structure,
        then judge a few practical things. Who you are, so it is obvious what your business is
        called, what it does and where it operates. What you offer, so your products, services and
        prices are stated plainly rather than hidden in images or vague marketing. Whether they can
        trust you, meaning you have real, checkable signals like an about page, contact details and
        evidence behind your claims. And whether they can quote you, meaning your information is
        written in clear, self-contained pieces a machine can lift into an answer rather than buried
        in long, meandering copy.
      </p>

      <h2>GEO in plain terms, three jobs</h2>
      <p>Every readiness question comes down to three steps a machine takes with your site.</p>
      <ol>
        <li>
          <strong>Find it (retrieval).</strong> The page has to be reachable and clearly about the
          topic being asked.
        </li>
        <li>
          <strong>Trust it (citation).</strong> The claims need to be specific and backed by
          identifiable evidence, so the system is comfortable quoting you.
        </li>
        <li>
          <strong>Use it (answer extraction).</strong> The key facts need to be in a form that lifts
          cleanly into a short answer, like a direct sentence, a spec, a comparison or a step.
        </li>
      </ol>

      <h2>What GEO is not</h2>
      <p>
        GEO is not keyword stuffing, and it is not a trick to game an AI. The systems change
        constantly and reward the same thing a good customer would, which is clear, honest, useful
        information. Anyone selling guaranteed AI mentions is selling something that does not exist,
        because no tool controls what an AI says. What you <em>can</em> control is how ready your
        site is to be read and quoted, and that is exactly what improves your odds.
      </p>

      <h2>Where to start</h2>
      <p>
        You do not need to rebuild your website. Most gaps are fixable. Clarify who you are and what
        you offer, add the trust pages you probably already have content for, and rewrite your key
        answers so they stand on their own. The fastest way to know what to fix is to measure it. Run
        a free readiness scan and you will get a score, a breakdown of the seven areas above, and a
        prioritized list of changes.
      </p>
    </ArticleLayout>
  );
}
