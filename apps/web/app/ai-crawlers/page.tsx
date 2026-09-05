import Link from "next/link";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CopyPromptButton } from "@/components/report/CopyPromptButton";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  CRAWLERS,
  PURPOSE_BLURB,
  PURPOSE_LABEL,
  SOURCES,
  VERIFIED_ON,
  type CrawlerPurpose,
  crawlersByPurpose,
  robotsSnippet,
} from "@/lib/content/crawlers";
import { CONTENT } from "@/lib/content/registry";
import { contentMetadata } from "@/lib/seo/content-metadata";
import { absoluteUrl } from "@/lib/seo/site";

const meta = CONTENT.find((c) => c.slug === "/ai-crawlers")!;

export const metadata = contentMetadata(meta.slug);

const ORDER: CrawlerPurpose[] = ["search", "training", "user", "ads"];

const SEARCH_TOKENS = crawlersByPurpose("search").map((c) => c.token);
const TRAINING_TOKENS = crawlersByPurpose("training").map((c) => c.token);

const RECIPES: { name: string; when: string; snippet: string }[] = [
  {
    name: "Open to everything",
    when:
      "You want maximum reach and have no licensing objection to your content being used in training. The default, and the right choice for most businesses selling something.",
    snippet: "User-agent: *\nAllow: /",
  },
  {
    name: "In the answers, out of the training",
    when:
      "You want to be found and cited, but do not want your work used to train models. The position most publishers land on, and the one people most often implement incorrectly.",
    snippet: `${robotsSnippet(SEARCH_TOKENS, "Allow: /")}\n\n${robotsSnippet(
      TRAINING_TOKENS,
      "Disallow: /",
    )}`,
  },
  {
    name: "Out of all of it",
    when:
      "Your content is the product and you sell access to it. Understand what you are choosing: you will not appear in AI answers, and that traffic goes to whoever does.",
    snippet: robotsSnippet([...SEARCH_TOKENS, ...TRAINING_TOKENS], "Disallow: /"),
  },
];

const FAQS = [
  {
    q: "Does blocking GPTBot remove me from ChatGPT?",
    a: "No, and this is the most common and most expensive mistake in the whole area. GPTBot is the training crawler. The bot that decides whether you appear in ChatGPT's search results is OAI-SearchBot. Blocking GPTBot keeps your content out of training while leaving you fully visible in ChatGPT search; blocking OAI-SearchBot removes you from the answers.",
  },
  {
    q: "Does blocking Google-Extended hurt my Google rankings?",
    a: "No. Google states plainly that Google-Extended has no effect on inclusion in Google Search and is not used as a ranking signal. It only governs whether your content trains Gemini and grounds its answers.",
  },
  {
    q: "Some of these bots ignore robots.txt. Is that allowed?",
    a: "OpenAI and Perplexity both state that their user-triggered agents do not follow robots.txt, on the grounds that a person asked for that specific page rather than a crawler deciding to visit. Whether you find that reasonable is your call; the practical point is that robots.txt will not stop them, so if you need to, block at the network or server level instead.",
  },
  {
    q: "Is a robots.txt rule enough to keep my content out of a model?",
    a: "It is the standard mechanism and the major vendors say they honour it, but it is a request, not a wall. It also does nothing retroactively: content already collected has already been collected. If exclusion genuinely matters to you, treat robots.txt as one layer and not the whole answer.",
  },
  {
    q: "Do I need llms.txt as well?",
    a: "It costs nothing and cannot hurt, but be clear-eyed about the status: no major engine has committed to reading it. It will not compensate for pages that are blocked, thin or contradictory. Fix robots.txt first.",
  },
];

function Snippet({ text }: { text: string }) {
  return (
    <div className="not-prose flex flex-col gap-2">
      <div className="flex justify-end">
        <CopyPromptButton text={text} label="Copy" />
      </div>
      <pre className="overflow-x-auto rounded-lg border border-border bg-surface-2/60 p-4 text-xs leading-relaxed">
        <code>{text}</code>
      </pre>
    </div>
  );
}

export default function Page() {
  // The reference itself, as data. A list of bots is exactly the shape an
  // answer engine can lift, and this page's whole claim is that the tokens
  // are right — so it states them machine-readably too.
  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "AI crawler user agents",
    description:
      "Every documented AI crawler user-agent token, its purpose, and whether the vendor states it honours robots.txt.",
    url: absoluteUrl("/ai-crawlers"),
    license: "https://creativecommons.org/licenses/by/4.0/",
    isAccessibleForFree: true,
    dateModified: VERIFIED_ON,
    creator: { "@type": "Organization", name: "Find Your AI Score" },
    variableMeasured: CRAWLERS.map((c) => ({
      "@type": "PropertyValue",
      name: c.token,
      description: `${c.company} — ${PURPOSE_LABEL[c.purpose]}. ${c.what}`,
    })),
  };

  return (
    <ArticleLayout
      title={meta.title}
      description={meta.description}
      category="Reference"
      updated={meta.updated}
      path={meta.slug}
      faqs={FAQS}
    >
      <JsonLd data={datasetJsonLd} />

      <p>
        There is no single &ldquo;AI bot&rdquo;. Thirteen documented user agents read the web on
        behalf of the major answer engines, and they do four different jobs. Treating them as one
        thing is how site owners end up blocking themselves out of ChatGPT while believing they
        only opted out of training.
      </p>
      <p>
        Every token below comes from the vendor&rsquo;s own documentation, linked at the foot of the
        page, and was checked on{" "}
        {new Date(VERIFIED_ON).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        . Copy them exactly &mdash; a misspelled user-agent line is not an error, it is a rule that
        silently matches nothing.
      </p>

      <h2>The one distinction that matters</h2>
      <p>
        <strong>Search bots decide whether you can appear in an answer. Training bots decide
        whether your work is used to build the model.</strong> They are separate tokens, separate
        decisions, and separate consequences. Most people want to be in the answers; many also want
        to stay out of the training. Those two wishes are compatible, and the recipe below does
        exactly that.
      </p>
      <p>
        The mistake to avoid is pasting a &ldquo;block AI crawlers&rdquo; snippet from a blog post.
        Most of those block the search bots too, which quietly removes you from the results you
        were trying to win.
      </p>

      {ORDER.map((purpose) => {
        const rows = crawlersByPurpose(purpose);
        if (rows.length === 0) return null;
        return (
          <div key={purpose}>
            <h2>{PURPOSE_LABEL[purpose]}</h2>
            <p>{PURPOSE_BLURB[purpose]}</p>
            <div className="not-prose overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2/40 text-left">
                    <th className="px-4 py-3 font-semibold">User agent</th>
                    <th className="px-4 py-3 font-semibold">Company</th>
                    <th className="px-4 py-3 font-semibold">robots.txt</th>
                    <th className="px-4 py-3 font-semibold">What it does</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.token} className="border-b border-border last:border-0 align-top">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{c.token}</td>
                      <td className="px-4 py-3 text-fg-muted">{c.company}</td>
                      <td className="px-4 py-3">
                        <span
                          className="font-mono text-xs"
                          style={{ color: c.obeysRobots ? "var(--excellent)" : "var(--warn)" }}
                        >
                          {c.obeysRobots ? "honoured" : "ignored"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-fg-muted">
                        {c.what}
                        {c.note && <span className="mt-1 block text-fg-subtle">{c.note}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <h2>Three policies, as copy-paste robots.txt</h2>
      <p>
        Pick the one that matches what you actually want. Put it in the <code>robots.txt</code> at
        the root of your domain, and keep whatever rules you already have for ordinary search
        engines.
      </p>
      {RECIPES.map((r) => (
        <div key={r.name}>
          <h3>{r.name}</h3>
          <p>{r.when}</p>
          <Snippet text={r.snippet} />
        </div>
      ))}

      <h2>After you change it, check it</h2>
      <p>
        A robots.txt rule that does not do what you think is worse than none, because you stop
        looking. Fetch your own <code>/robots.txt</code> in a browser and read it back. Then check
        your server logs for the tokens above to see which bots actually reach you &mdash; that is
        the ground truth, and it is the one thing no tool can tell you from the outside.
      </p>
      <p>
        For everything downstream of access &mdash; whether the page can be understood and quoted
        once a bot does reach it &mdash; a <Link href="/">free readiness scan</Link> reads your site
        the way these crawlers do and scores what it finds. See also{" "}
        <Link href="/is-chatgpt-reading-my-website">is ChatGPT reading my website</Link> and{" "}
        <Link href="/why-is-my-site-not-in-ai-answers">why a site does not show up in AI answers</Link>
        .
      </p>

      <h2>Sources</h2>
      <p>Each vendor&rsquo;s own documentation. If a token here ever disagrees with these, they win.</p>
      <ul>
        {SOURCES.map((s) => (
          <li key={s.url}>
            {s.company}:{" "}
            <a href={s.url} rel="nofollow noopener" target="_blank">
              {s.url.replace(/^https:\/\//, "")}
            </a>
          </li>
        ))}
      </ul>
    </ArticleLayout>
  );
}
