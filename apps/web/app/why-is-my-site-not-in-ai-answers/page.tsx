import Link from "next/link";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";
import { contentMetadata } from "@/lib/seo/content-metadata";

const meta = CONTENT.find((c) => c.slug === "/why-is-my-site-not-in-ai-answers")!;

export const metadata = contentMetadata(meta.slug);

const CAUSES: { h: string; symptom: string; p: string; fix: string }[] = [
  {
    h: "You are blocked",
    symptom: "No AI user agents appear in your server logs at all.",
    p: "A robots.txt rule, a noindex header, a firewall or a bot-protection product is turning the crawler away. Often nobody chose this: it arrives with a template, a plugin default or a security setting somebody enabled two years ago.",
    fix: "Read your own robots.txt end to end, then check for X-Robots-Tag headers and any bot filtering at the CDN. The token names have to be exact.",
  },
  {
    h: "You are reachable but unreadable",
    symptom: "Bots appear in the logs, but nothing you publish ever surfaces.",
    p: "The crawler receives an empty shell because your content is assembled in the browser by JavaScript. Many AI crawlers never run scripts. You will not get an error — just silence, indefinitely.",
    fix: "Fetch your own page without JavaScript and read what comes back. Whatever is missing does not exist for those crawlers. Server-render the content that matters.",
  },
  {
    h: "Nobody can tell who you are",
    symptom: "You appear for your brand name and never for what you actually do.",
    p: "The machine has no confident answer to what this business is called, what it sells and where it operates. Inconsistent naming, no structured data, a footer that disagrees with the imprint. Ambiguous entities lose to competitors the model is sure about.",
    fix: "One consistent name everywhere, a real address and contact, and structured data that matches the visible page. Start with the entity clarity guide.",
  },
  {
    h: "You never answer the question",
    symptom: "You rank in search, but you are absent from AI answers on the same topics.",
    p: "This is the most common cause among sites that are otherwise healthy, and the least visible. Your pages describe what you sell; they do not answer what people ask before buying. There is no passage to lift because the question is never posed on the page.",
    fix: "Take the questions a buyer would put to an assistant and check, page by page, whether you answer them. Where you do not, that is a missing section, not a missing keyword.",
  },
  {
    h: "You say nothing specific enough to quote",
    symptom: "Your pages get read, and competitors get cited from thinner content.",
    p: "Everything on the page could have been written about any competitor. There is no price, no number, no named example, no dated claim. A model choosing what to quote takes the sentence that carries information.",
    fix: "Add one checkable fact per important page: a range, a real project, a measured result, a condition. First-party detail has no competition.",
  },
  {
    h: "Nothing corroborates you",
    symptom: "Everything above is fixed and you still lose to bigger names.",
    p: "Retrieval leans on the same corroboration signals search does. A new domain that nothing links to is a claim with no second source, and models are conservative about attributing to those.",
    fix: "Get mentioned somewhere that is already read. This is the slowest item on the list and it is not a technical task.",
  },
  {
    h: "Nobody is asking",
    symptom: "You are healthy, cited when tested, and it changes nothing commercially.",
    p: "The uncomfortable one. If almost nobody asks assistants about your category yet, being the perfect answer to a question nobody puts is worth very little this quarter.",
    fix: "Check whether the questions you are optimising for are ones people actually ask today. If they are not, the work is still right — it is just an investment with a longer horizon, and it should be budgeted as one.",
  },
];

const FAQS = [
  {
    q: "I rank well in Google. Why am I missing from AI answers?",
    a: "Ranking gets a link placed on a results page; citation requires a passage a model can lift and attribute. A page can rank on authority and internal linking while containing no self-contained, specific answer to the question being asked. The two jobs overlap on fundamentals and diverge on the finish.",
  },
  {
    q: "How long after fixing something should I expect a change?",
    a: "Access fixes take effect at the next crawl. Content changes wait on re-crawling and re-indexing, usually weeks. Corroboration takes months. If nothing has changed after a fortnight, that is normal, not evidence the fix failed.",
  },
  {
    q: "My competitor is cited and their site is worse than mine.",
    a: "Almost always one of three things: they are reachable where you are blocked, they state something specific where you state a benefit, or something already-trusted links to them. Check in that order — it is usually the first.",
  },
  {
    q: "Is there a way to see which of these applies to me?",
    a: "Logs answer the first cause. A readiness scan answers the middle four, since they are exactly what it measures, with the evidence for each. The last two are commercial judgement and no tool decides them for you.",
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
        There are seven reasons, and they occur in a fixed order. Each one makes the ones below it
        irrelevant: there is no point writing better answers if the crawler cannot fetch the page,
        and no point in structured data if you never answer the question. Work down the list and
        stop at the first one that is true of you.
      </p>

      {CAUSES.map((c, i) => (
        <div key={c.h}>
          <h2>
            {String(i + 1).padStart(2, "0")}. {c.h}
          </h2>
          <p>
            <strong>What it looks like.</strong> {c.symptom}
          </p>
          <p>{c.p}</p>
          <p>
            <strong>What to do.</strong> {c.fix}
          </p>
        </div>
      ))}

      <h2>Where to start</h2>
      <p>
        Your server logs settle cause one in about five minutes, and it is the most common. If bots
        are arriving, the middle four causes are what a{" "}
        <Link href="/">free readiness scan</Link> measures directly, with the evidence behind each
        finding rather than a verdict you have to take on faith.
      </p>
      <p>
        Related: the <Link href="/ai-crawlers">AI crawler reference</Link> for who is allowed to
        read you, <Link href="/is-chatgpt-reading-my-website">is ChatGPT reading my website</Link>{" "}
        for establishing whether anything arrives, and{" "}
        <Link href="/how-to-get-cited-by-chatgpt">how to get cited by ChatGPT</Link> for the work
        once it does.
      </p>
    </ArticleLayout>
  );
}
