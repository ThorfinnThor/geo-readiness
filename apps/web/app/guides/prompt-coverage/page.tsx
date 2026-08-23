import type { Metadata } from "next";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";

const meta = CONTENT.find((c) => c.slug === "/guides/prompt-coverage")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.slug },
  openGraph: { title: meta.title, description: meta.description, url: meta.slug, type: "article" },
};

export default function Page() {
  return (
    <ArticleLayout
      title="Prompt Coverage. Answer the questions customers actually ask"
      description="AI answers specific questions. If no page on your site clearly addresses one, a competitor's page does. Here is how to find and cover the questions that matter for your business."
      category="Guide"
      updated={meta.updated}
      path={meta.slug}
      faqs={[
        {
          q: "How do I know what questions customers ask?",
          a: "Start with what you already hear on sales calls and in support emails, and the but what about questions. Add the obvious buyer questions about cost, how it works, whether it is right for me, how long it takes, what is included, and how to choose. Those are the prompts AI is answering.",
        },
        {
          q: "Should I make one giant FAQ page?",
          a: "A focused FAQ helps, but the strongest approach is to answer each important question where it belongs, on the relevant service or topic page, in a clear section. That matches a specific page to a specific question.",
        },
        {
          q: "Isn't this just keyword targeting again?",
          a: "No. Keyword targeting repeats a phrase to rank. Prompt coverage means genuinely answering a real question a person would ask an assistant. The unit is a question and a useful answer, not a keyword.",
        },
      ]}
    >
      <p>
        Prompt coverage measures whether your site actually answers the questions your customers ask.
        AI assistants field specific prompts, like <em>&quot;what does a home battery cost?&quot;</em>,{" "}
        <em>&quot;do you serve my area?&quot;</em>, or{" "}
        <em>&quot;solar vs a generator, which is better?&quot;</em>. If a page on your site clearly
        answers a prompt, you can be the source. If not, the assistant answers from someone else.
      </p>

      <h2>Think in questions, not pages</h2>
      <p>
        Most sites are organized around what the business wants to say, like services, about and
        contact. AI works from what the customer wants to know. The fix is to map the real questions
        and make sure each important one is clearly answered somewhere obvious.
      </p>

      <h2>How to fix it</h2>
      <ol>
        <li>
          <strong>List the real questions.</strong> Pull from sales and support. Cost, how it works,
          whether it is right for me, how long it takes, what is included, how to choose, do you serve
          my area, and what results to expect.
        </li>
        <li>
          <strong>Match each question to a page.</strong> Most belong on the relevant service or topic
          page. Add a clear section that answers it directly.
        </li>
        <li>
          <strong>Answer the question in the first sentence</strong> of that section, then explain. Do
          not bury the answer three paragraphs down.
        </li>
        <li>
          <strong>Cover the comparisons.</strong> The X vs Y and how to choose questions are heavily
          asked of assistants and often uncovered by businesses.
        </li>
        <li>
          <strong>Add a focused FAQ</strong> for the short, common questions that do not need a full
          page, and mark it up as an FAQ (see the structured-data guide).
        </li>
      </ol>

      <h2>A quick test</h2>
      <p>
        Take the five questions you hear most from customers. For each one, is there a page on your
        site that answers it plainly, near the top? If you hesitate on any of them, that is an
        uncovered prompt, and a place a competitor is getting quoted instead of you.
      </p>

      <p>
        A free readiness scan generates the likely questions for your type of business and shows how
        well your pages cover them, including which ones have no clear answer at all.
      </p>
    </ArticleLayout>
  );
}
