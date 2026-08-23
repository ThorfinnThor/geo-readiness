import type { Metadata } from "next";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";

const meta = CONTENT.find((c) => c.slug === "/how-ai-reads-your-website")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.slug },
  openGraph: { title: meta.title, description: meta.description, url: meta.slug, type: "article" },
};

export default function Page() {
  return (
    <ArticleLayout
      title="How AI answer engines read your website"
      description="ChatGPT, Gemini and Perplexity do not browse like a person. They fetch pages, strip them to text, extract facts and decide what to quote. Here is what actually happens to your site, and why a page that looks perfect can still be invisible."
      category="Explainer"
      updated={meta.updated}
      path={meta.slug}
      faqs={[
        {
          q: "Does my website design affect how AI reads it?",
          a: "Barely. AI systems read the underlying text and structure, not the visual design. A page can look beautiful to a person and be nearly empty to a machine, for example if the important text is inside images or only appears after heavy scripting.",
        },
        {
          q: "My site works fine in a browser. Why would AI see it differently?",
          a: "A browser runs all your page's code and shows the finished result. Many AI crawlers read the raw page and do not run all that code. If your key content only appears after scripts run, the machine may see a near-empty page.",
        },
        {
          q: "What is answer extraction?",
          a: "It is the step where the system lifts a specific fact from your page into its answer, like a price, a definition, a step or a yes or no. Content written in clear, self-contained pieces extracts cleanly. Content buried in long, vague paragraphs often does not.",
        },
        {
          q: "How can I see my site the way AI does?",
          a: "Run a free readiness scan. It fetches your pages the way an AI system would, shows what it could actually read and extract, and flags where your content is invisible or unquotable.",
        },
      ]}
    >
      <p>
        It is tempting to picture an AI looking at your website the way a customer does. It does not.
        Understanding the real, unglamorous steps a machine takes explains why a page that looks
        perfect to you can still be useless to ChatGPT, and what to do about it.
      </p>

      <h2>Step one. It fetches the page, and often stops early</h2>
      <p>
        The system requests your page like any visitor. But two things commonly go wrong here. First,
        some sites block automated visitors outright, so the machine gets nothing. Second, and more
        common, modern sites build much of their content with scripts that run <em>after</em> the
        page arrives. A person&apos;s browser runs all of that. Many AI crawlers read the raw page as
        delivered. If your headline, prices and copy only appear once scripts finish, the machine may
        see a nearly blank page.
      </p>

      <h2>Step two. It strips your page down to text and structure</h2>
      <p>
        Design, colors and layout are discarded. What remains is your words and the{" "}
        <strong>structure</strong> around them, meaning the page title, headings, lists, tables and
        links. This is why structure matters so much. A heading tells the machine this section is
        about a topic. A table says these are specifications. A wall of undifferentiated text says
        very little. Two pages with the same words but different structure are not equal to a machine.
      </p>

      <h2>Step three. It figures out what the page is about</h2>
      <p>
        The system decides whether your page actually answers the question at hand. This is not about
        repeating a keyword. It is about clearly addressing the real thing a person asked, which is
        the service, the product, the place, the specific question. A page that dances around the
        topic in clever marketing language reads, to a machine, as not really about this.
      </p>

      <h2>Step four. It extracts facts it can quote</h2>
      <p>
        This is the step most sites lose. To use you in an answer, the system needs to lift a{" "}
        <strong>specific, self-contained fact</strong>, like a price, a number, a step, a spec, or a
        clear yes or no. Compare these two sentences.
      </p>
      <blockquote>
        &quot;We pride ourselves on transparent, competitive pricing tailored to your unique
        needs.&quot; There is nothing to extract.
      </blockquote>
      <blockquote>
        &quot;Starter installations begin at &euro;12,400 before the 30% federal incentive.&quot;
        That is a clean, quotable fact.
      </blockquote>
      <p>
        Same page, wildly different usefulness to an AI. The first sounds nice to a human and says
        nothing a machine can carry away.
      </p>

      <h2>Step five. It decides whether to trust you</h2>
      <p>
        Before quoting you, the system weighs whether you are credible. Is it clear who you are, is
        there an about and contact page, are claims backed by identifiable evidence, is the
        information current? Anonymous, evidence-free pages get passed over in favor of ones that look
        accountable, even when the anonymous page is technically correct.
      </p>

      <h2>What this means for you</h2>
      <p>
        You cannot control what an AI system ultimately says, but you control every step above. Make
        sure your real content is present without requiring scripts. Give it structure with headings,
        lists and tables. Write your key facts as clear, standalone statements. Show who you are and
        back your claims. Do that, and you move from invisible to quotable.
      </p>
      <p>
        The quickest way to find your specific gaps is to see your site through a machine&apos;s eyes.
        Run a free readiness scan and it will show what it could actually read, structure and extract
        from your pages.
      </p>
    </ArticleLayout>
  );
}
