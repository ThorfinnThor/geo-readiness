import Link from "next/link";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";
import { contentMetadata } from "@/lib/seo/content-metadata";

const meta = CONTENT.find((c) => c.slug === "/should-i-block-ai-crawlers")!;

export const metadata = contentMetadata(meta.slug);

const CASES: { who: string; verdict: string; p: string }[] = [
  {
    who: "You sell a product or a service",
    verdict: "Allow the search bots. Blocking training is optional.",
    p: "Your pages exist to be found by people who might buy. An assistant naming you in an answer is the modern version of ranking, and you gain nothing by being absent from it. Whether you also let your marketing copy train a model is a matter of taste with almost no commercial consequence either way.",
  },
  {
    who: "You are a publisher and your writing is the product",
    verdict: "This is a genuine dilemma, and the tokens let you split it.",
    p: "Training use takes your work and gives nothing back. Search use sends readers to you, or at least names you. The split policy exists precisely for this: allow the search bots so you stay in the answers, disallow the training bots so your archive is not absorbed. Several large publishers have landed exactly there.",
  },
  {
    who: "You run a documentation or reference site",
    verdict: "Allow everything, and mean it.",
    p: "Being the source a model reaches for is the entire point. Documentation that an assistant can quote accurately reduces your support load. This is the clearest case on the list and the one people most often get wrong out of vague caution.",
  },
  {
    who: "You sell access to the content itself",
    verdict: "Block, and understand what you are buying.",
    p: "Courses, research, paid archives, databases. If the content is the product, giving it away for free inside an answer is the whole business model leaking. Block both categories, accept that you will not appear, and compete on the part that is behind the wall.",
  },
  {
    who: "Your site is mostly a shopfront for a local business",
    verdict: "Allow everything. There is no downside here.",
    p: "There is nothing to protect and everything to gain: people asking an assistant for a provider near them is exactly the query you want to win. Blocking is pure cost with no corresponding benefit.",
  },
  {
    who: "You are being crawled into the ground",
    verdict: "That is a load problem, not a policy one.",
    p: "If a bot is hammering you, rate-limit it or use Crawl-delay rather than reaching for a blanket ban you will forget you set. Deciding your visibility policy while annoyed about a traffic spike is how sites end up invisible for years.",
  },
];

const FAQS = [
  {
    q: "Does blocking AI crawlers protect my copyright?",
    a: "It expresses a preference and creates a record of it, which has some value. It does not undo anything already collected, it does not bind anyone who ignores robots.txt, and it is not a legal instrument. Treat it as one layer of a position, not the position itself.",
  },
  {
    q: "If I block AI crawlers, do I still rank in Google?",
    a: "Yes, provided you block the right tokens. Google-Extended governs Gemini training and grounding only; Google states it has no effect on inclusion in Google Search and is not a ranking signal. Blocking Googlebot itself is a different and much more damaging action.",
  },
  {
    q: "Can I block AI crawlers and still be in ChatGPT?",
    a: "Yes, and this is the point most people miss. Disallow GPTBot and you are out of OpenAI's training data while remaining fully eligible to appear in ChatGPT's search results, which are governed by OAI-SearchBot. The two are separate tokens with separate consequences.",
  },
  {
    q: "What happens if I do nothing?",
    a: "With no robots.txt, or one that does not mention these agents, everything is allowed. For most businesses that is the right outcome, but it should be a decision you made rather than a default you inherited.",
  },
  {
    q: "Is there a downside to allowing everything?",
    a: "Server load, and the fact that your content may train models that compete with you at some remove. For most businesses selling something other than words, neither outweighs being present in the answers.",
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
        Most writing on this question is either &ldquo;block them, they are stealing from you&rdquo;
        or &ldquo;allow them, this is the future&rdquo;. Both skip the part that decides the answer:
        it is not one decision. It is two, and they are controlled by different tokens.
      </p>

      <h2>The two decisions</h2>
      <p>
        <strong>Does your work train their models?</strong> That is a rights question. You get
        nothing directly in return, and the argument for saying no is straightforward if your
        content has value on its own.
      </p>
      <p>
        <strong>Do you appear in their answers?</strong> That is a distribution question, and it is
        the modern equivalent of asking whether you want to show up in search. For almost every
        business that sells something, the answer is obviously yes.
      </p>
      <p>
        Conflating the two is the expensive mistake. A great many sites pasted a
        &ldquo;block AI&rdquo; snippet meaning to answer the first question, and answered the second
        one by accident. They are now absent from products their competitors appear in, and most of
        them do not know it. The{" "}
        <Link href="/ai-crawler-check">free crawler check</Link> will tell you in five seconds which
        side of that line you are on.
      </p>

      <h2>Who should decide what</h2>
      {CASES.map((c) => (
        <div key={c.who}>
          <h3>{c.who}</h3>
          <p>
            <strong>{c.verdict}</strong>
          </p>
          <p>{c.p}</p>
        </div>
      ))}

      <h2>What blocking actually buys you</h2>
      <p>
        Be clear-eyed about the mechanism. A robots.txt rule is a request that the major vendors say
        they honour. It is not a wall, it does nothing retroactively about content already
        collected, and two documented agents state outright that they ignore it because a human
        initiated the request. If exclusion genuinely matters to you, robots.txt is the first layer
        of a position that also needs server-level enforcement and, at some point, a lawyer.
      </p>
      <p>
        What it does buy you is a clear, public, dated statement of intent, honoured by the vendors
        who have committed to honouring it. That is not nothing. It is just less than the confident
        advice on either side implies.
      </p>

      <h2>A reasonable default</h2>
      <p>
        If you sell anything other than the words themselves: allow the search bots, and decide
        about training on principle rather than on fear. If your writing is the product: take the
        split policy, stay in the answers, keep your archive out of the training sets. If you sell
        access to the content: block both and compete behind the wall.
      </p>
      <p>
        Whatever you choose, choose it deliberately and then verify it. The exact tokens and three
        copy-paste policies are on the <Link href="/ai-crawlers">AI crawler reference</Link>; the{" "}
        <Link href="/ai-crawler-check">checker</Link> confirms your live file does what you think it
        does. And if you have decided to be visible,{" "}
        <Link href="/how-to-get-cited-by-chatgpt">being reachable is only the first step</Link>.
      </p>
    </ArticleLayout>
  );
}
