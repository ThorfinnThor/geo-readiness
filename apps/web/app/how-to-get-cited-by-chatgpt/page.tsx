import Link from "next/link";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";
import { contentMetadata } from "@/lib/seo/content-metadata";

const meta = CONTENT.find((c) => c.slug === "/how-to-get-cited-by-chatgpt")!;

export const metadata = contentMetadata(meta.slug);

const STEPS: { h: string; p: string }[] = [
  {
    h: "Be fetchable, and verify it rather than assuming it",
    p: "Nothing below matters if the crawler never arrives or leaves with an empty page. Allow the search bots explicitly, and check that your content exists in the raw HTML rather than only after JavaScript runs. This is the step people skip because it feels too basic, and it is the step that most often explains the whole problem.",
  },
  {
    h: "Answer the question in the words it was asked",
    p: "Retrieval matches meaning, not keywords, but it still needs the question to exist on your page. Put the actual question in a heading and the actual answer directly beneath it. A page that circles a topic for eight paragraphs before saying anything specific has no passage worth lifting.",
  },
  {
    h: "Make each passage stand on its own",
    p: "Pages are split into chunks before they are indexed, and each chunk is judged alone. If your answer only makes sense with the introduction three sections above it, no single chunk contains it. Write sections that survive being read out of context, because that is how they will be read.",
  },
  {
    h: "Say something only you can say",
    p: "Rewritten industry background competes with a thousand identical pages and wins none of them. A price range, a real project with numbers, a method described precisely, the conditions under which you decline work — these have no competition, because they exist nowhere else. This is the single highest-leverage thing on the list.",
  },
  {
    h: "Be identifiable enough to be worth trusting",
    p: "A model deciding whether to attribute a claim to you needs to know who you are. A real business name used consistently, an address, an imprint, named authors, matching structured data. Anonymous pages get read and not credited.",
  },
  {
    h: "State facts plainly, and date them",
    p: "“Industry-leading response times” is unquotable. “We respond within four working hours, measured across 2026” can be quoted, checked and attributed. Dates matter more than most people expect: an undated claim is a claim a careful model will hedge or skip.",
  },
  {
    h: "Mark it up so the facts survive extraction",
    p: "Structured data restates your facts in a form that cannot be misread by a layout change: what the business is, what it offers, what things cost, who wrote this. It has to agree with what a reader sees — schema that claims a price the page does not show costs more trust than the missing markup would have.",
  },
  {
    h: "Get linked from somewhere already trusted",
    p: "This is the one you cannot do on your own site, and the one with the longest lead time. Retrieval systems still lean on the same corroboration signals search does. One genuine mention on a site that is already read beats any amount of on-page work.",
  },
];

const FAQS = [
  {
    q: "Can anyone guarantee ChatGPT will cite my site?",
    a: "No. Answer engines are non-deterministic and their retrieval is not published or controllable. Anyone selling guaranteed AI citations is selling something they cannot deliver. What is genuinely controllable is whether your page is fetchable, understandable, specific and attributable — the preconditions. Being cited is downstream of those and never certain.",
  },
  {
    q: "How long does it take?",
    a: "Fixing access is immediate: the next crawl sees the change. Content changes take as long as re-crawling and re-indexing take, typically weeks. Earning the corroboration that makes a model comfortable attributing something to you takes months. Anyone quoting you days is guessing.",
  },
  {
    q: "Does being cited by ChatGPT bring traffic?",
    a: "Some, and less per impression than a search result did. The honest framing is that the citation is the visibility: being the source named in the answer is what shapes the buyer's shortlist, whether or not they click through immediately.",
  },
  {
    q: "How do I check whether it worked?",
    a: "Ask a blinded question — one that describes what you do without naming your brand or domain — and see which sources come back. Naming your site in the prompt guarantees the model finds it and proves nothing. Every scan report here generates those neutral questions from your own business profile and gives you a two-step prompt to run the test.",
  },
];

export default function Page() {
  return (
    <ArticleLayout
      title={meta.title}
      description={meta.description}
      category="Guide"
      updated={meta.updated}
      path={meta.slug}
      faqs={FAQS}
    >
      <p>
        Start with what is not true: nobody can guarantee a citation. Answer engines are
        non-deterministic &mdash; ask the same question twice and you can get two different answers
        with two different sources &mdash; and no vendor publishes or sells access to how retrieval
        ranks pages. Anyone promising you mentions is promising something they do not control.
      </p>
      <p>
        What you <em>can</em> control is whether your page is the easiest one in your category to
        quote. That is a real, finite list of work, and most sites fail on the first item.
      </p>

      <h2>How a citation actually happens</h2>
      <p>
        Modern assistants do not answer from memory. A retrieval step finds candidate passages, and
        the model writes its answer using those, linking what it used. Three consequences follow,
        and they set the whole strategy:
      </p>
      <ul>
        <li>
          <strong>You compete at retrieval, before any writing happens.</strong> A page the
          retriever never returns cannot be cited however good it is.
        </li>
        <li>
          <strong>Passages compete, not pages.</strong> Your page is split into chunks and each is
          judged alone.
        </li>
        <li>
          <strong>Being quoted requires being safe to attribute.</strong> A specific, dated,
          attributable claim is easier to use than a vague one.
        </li>
      </ul>

      <h2>The work, in order of leverage</h2>
      {STEPS.map((s, i) => (
        <div key={s.h}>
          <h3>
            {String(i + 1).padStart(2, "0")}. {s.h}
          </h3>
          <p>{s.p}</p>
        </div>
      ))}

      <h2>How to tell whether any of it worked</h2>
      <p>
        Test blind. Ask a question that describes what you do without naming your brand or your
        domain, and look at which sources come back. If you name yourself in the prompt the model
        will find you, and you will have learned nothing.
      </p>
      <p>
        That is exactly what the citation self-test in a report does: it generates neutral questions
        from your own business profile, in your site&rsquo;s language, strips your brand out of
        them, and gives you a two-step prompt &mdash; one blind search, then one check of the
        sources it used. A miss is not proof a page is weak, and a hit is not a ranking. It is one
        honest observation you can repeat.
      </p>
      <p>
        <Link href="/">Run a free scan</Link> to get your questions, or read{" "}
        <Link href="/why-is-my-site-not-in-ai-answers">why a site does not show up in AI answers</Link>{" "}
        if you already know you are missing.
      </p>
    </ArticleLayout>
  );
}
