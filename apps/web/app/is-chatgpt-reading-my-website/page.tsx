import Link from "next/link";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CopyPromptButton } from "@/components/report/CopyPromptButton";
import { crawlersByPurpose } from "@/lib/content/crawlers";
import { CONTENT } from "@/lib/content/registry";
import { contentMetadata } from "@/lib/seo/content-metadata";

const meta = CONTENT.find((c) => c.slug === "/is-chatgpt-reading-my-website")!;

export const metadata = contentMetadata(meta.slug);

const OPENAI = ["OAI-SearchBot", "GPTBot", "ChatGPT-User", "OAI-AdsBot"];

const GREP = `grep -iE "OAI-SearchBot|GPTBot|ChatGPT-User|ClaudeBot|Claude-SearchBot|PerplexityBot" access.log \\
  | awk '{print $1, $4, $7}' | tail -50`;

const FAQS = [
  {
    q: "How do I know if ChatGPT has read my site?",
    a: "Your server logs are the only real answer. Search them for OAI-SearchBot, GPTBot and ChatGPT-User; each line is a page OpenAI actually fetched, with the timestamp and the path. Everything else — including this site — can only tell you whether it is possible, not whether it happened.",
  },
  {
    q: "I blocked GPTBot. Am I out of ChatGPT?",
    a: "No. GPTBot is the training crawler. OAI-SearchBot is the one that puts you in ChatGPT's search results. If you blocked only GPTBot you are still fully eligible to appear in answers.",
  },
  {
    q: "My site is new. Why has nothing crawled it?",
    a: "AI crawlers find pages roughly the way search engines do: through links and sitemaps. A new domain with no inbound links can go weeks without a visit. Getting linked from somewhere already crawled is the fastest fix, and it is not a technical one.",
  },
  {
    q: "Can I force ChatGPT to read my site?",
    a: "No. You can remove every obstacle and make the page worth fetching, and you can ask it about your site yourself, which triggers a live fetch by ChatGPT-User. You cannot make the search crawler prioritise you.",
  },
];

export default function Page() {
  return (
    <ArticleLayout
      title={meta.title}
      description={meta.description}
      category="Explainer"
      updated={meta.updated}
      path={meta.slug}
      faqs={FAQS}
    >
      <p>
        The question has four answers, because four different OpenAI bots can touch your site and
        they do different jobs. &ldquo;Is ChatGPT reading my website&rdquo; usually means one of two
        much more specific things: <em>can I show up when someone asks about my industry</em>, or{" "}
        <em>is my content being used to train the model</em>. Those are controlled separately.
      </p>

      <h2>The four bots, and which one you mean</h2>
      <ul>
        {crawlersByPurpose("search")
          .concat(crawlersByPurpose("training"), crawlersByPurpose("user"), crawlersByPurpose("ads"))
          .filter((c) => OPENAI.includes(c.token))
          .map((c) => (
            <li key={c.token}>
              <code>{c.token}</code> &mdash; {c.what}{" "}
              {c.obeysRobots ? "Follows robots.txt." : "Does not follow robots.txt."}
            </li>
          ))}
      </ul>
      <p>
        If you want to be <strong>in ChatGPT&rsquo;s answers</strong>, the bot that matters is{" "}
        <code>OAI-SearchBot</code>. If you want to be <strong>out of the training data</strong>, the
        one that matters is <code>GPTBot</code>. Confusing the two is the single most common
        self-inflicted wound in this area. The full list, including Anthropic, Perplexity, Google
        and Apple, is on the <Link href="/ai-crawlers">AI crawler reference</Link>.
      </p>

      <h2>Check one: is anything blocked?</h2>
      <p>
        Open <code>https://yourdomain.com/robots.txt</code> in a browser and read it. You are
        looking for any <code>Disallow</code> under the tokens above, and for a blanket{" "}
        <code>User-agent: *</code> with <code>Disallow: /</code>, which blocks everything. A rule
        with a misspelled token matches nothing at all, so read the strings character by character.
      </p>
      <p>
        Worth knowing: a page can also be blocked without robots.txt saying so. A{" "}
        <code>noindex</code> meta tag, an <code>X-Robots-Tag</code> header, a login wall, a firewall
        rule or a bot-protection product can each stop a crawler while your browser sees the page
        perfectly.
      </p>

      <h2>Check two: your server logs. This is the real answer.</h2>
      <p>
        Logs are the only place where &ldquo;did it actually happen&rdquo; is recorded. Every fetch
        leaves a line with the user agent, the path and the time. If you have shell access:
      </p>
      <div className="not-prose flex flex-col gap-2">
        <div className="flex justify-end">
          <CopyPromptButton text={GREP} label="Copy command" />
        </div>
        <pre className="overflow-x-auto rounded-lg border border-border bg-surface-2/60 p-4 text-xs leading-relaxed">
          <code>{GREP}</code>
        </pre>
      </div>
      <p>
        On managed hosting, the same thing lives under a name like &ldquo;access logs&rdquo;,
        &ldquo;traffic&rdquo; or &ldquo;bot analytics&rdquo;. Cloudflare, Vercel, Netlify and most
        CMS platforms will show you requests by user agent. No lines for these tokens means no
        OpenAI bot has been to your site, and no amount of on-page work changes that until it does.
      </p>

      <h2>Check three: can it use the page once it arrives?</h2>
      <p>
        Being fetched is necessary and not sufficient. A crawler that renders no JavaScript sees
        whatever your server sent as raw HTML. If your content is assembled in the browser, the bot
        got an empty shell and left without an error anyone will ever see.
      </p>
      <p>
        The quick version of this test: view your page&rsquo;s source, or fetch it with{" "}
        <code>curl</code>, and look for the actual words of your content. Whatever is missing there
        is invisible to a meaningful share of the machines you are trying to reach. That is what a{" "}
        <Link href="/">free readiness scan</Link> automates: it fetches your site the way these
        crawlers do and reports what survived the trip.
      </p>

      <h2>Check four: ask it yourself, carefully</h2>
      <p>
        Asking ChatGPT about your own website triggers a live fetch by{" "}
        <code>ChatGPT-User</code>, so it proves the page is reachable right now. It proves almost
        nothing else. You told the model which site to look at, so of course it found it. The
        question that matters is whether it reaches you when it has <em>not</em> been told &mdash;
        which is why the citation self-test in a scan report gives you a blinded prompt that never
        names your domain.
      </p>

      <h2>In order</h2>
      <ol>
        <li>Read your robots.txt. Unblock what you did not mean to block.</li>
        <li>Search your logs. Establish whether anything is arriving at all.</li>
        <li>
          If nothing is arriving: you have a discovery problem, not a technical one. Links and a
          submitted sitemap fix that; nothing on the page does.
        </li>
        <li>
          If bots arrive but you are never cited: you have a content problem. Start with{" "}
          <Link href="/why-is-my-site-not-in-ai-answers">why a site does not show up in AI answers</Link>
          .
        </li>
      </ol>
    </ArticleLayout>
  );
}
