import type { Metadata } from "next";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";

const meta = CONTENT.find((c) => c.slug === "/guides/entity-clarity")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.slug },
  openGraph: { title: meta.title, description: meta.description, url: meta.slug, type: "article" },
};

export default function Page() {
  return (
    <ArticleLayout
      title="Entity Clarity: make it obvious who your business is"
      description="AI systems leave you out of specific, local and branded answers when it is unclear what your business is called, what it does and where it operates. Here is how to fix that."
      category="Guide"
      updated={meta.updated}
      path={meta.slug}
      faqs={[
        {
          q: "Why would an AI not know my business name?",
          a: "Because it reads the page, not your intentions. If your name only appears in a logo image, or your homepage title says 'Home' instead of your business name, a machine has nothing clear to latch onto. It reads text and structure, not pictures.",
        },
        {
          q: "Do I need to repeat my business name everywhere?",
          a: "No — that reads as spam. State it clearly once in the right places (page title, heading, an about page, structured data) and let it be consistent. Clarity beats repetition.",
        },
        {
          q: "We operate in several cities. What should I do?",
          a: "Name the places you serve plainly, ideally with a real page or section per location that has genuine local content — not the same page with the city swapped. Vague 'we serve the whole region' helps neither people nor machines.",
        },
      ]}
    >
      <p>
        <strong>Entity clarity</strong> is how obvious it is <em>what your business is called, what
        it does, and where it operates</em>. It is the first thing an AI system needs, because
        without it you cannot appear in specific answers — the local ones, the branded ones, the
        &quot;who does X near me&quot; ones that convert best.
      </p>
      <p>
        The trap is that this is usually crystal clear to <em>you</em> and invisible to a{" "}
        <em>machine</em>. You know it&apos;s your company; the machine only sees whatever text and
        labels are actually on the page.
      </p>

      <h2>What the machine checks</h2>
      <ul>
        <li>Is the business name stated in real text (not only in a logo image)?</li>
        <li>Is it consistent across the page title, headings and content?</li>
        <li>Is there an about page that says plainly who you are?</li>
        <li>Is the location / service area named?</li>
        <li>Is the identity confirmed in structured data (see the structured-data guide)?</li>
      </ul>

      <h2>How to fix it</h2>
      <ol>
        <li>
          <strong>Put your real name in the homepage title.</strong> Not &quot;Home&quot; — your
          business name and what you do, e.g. &quot;BrightSolar — Solar &amp; Battery Installation
          in Austin, TX&quot;.
        </li>
        <li>
          <strong>Write a genuine about page.</strong> One or two paragraphs: who you are, what you
          do, where, since when. This single page lifts entity clarity and trust at once.
        </li>
        <li>
          <strong>Name your location in text.</strong> City, region, or clear service area — in
          words, not just a map embed.
        </li>
        <li>
          <strong>Be consistent.</strong> Use the same business name everywhere. Mixing
          &quot;BrightSolar&quot;, &quot;Bright Solar Inc.&quot; and &quot;the team&quot; makes a
          machine unsure which is the real entity.
        </li>
        <li>
          <strong>Confirm it in structured data.</strong> Organization markup states your name,
          URL and address in a format machines read without guessing.
        </li>
      </ol>

      <h2>Before and after</h2>
      <blockquote>
        Title: &quot;Home&quot; · H1: &quot;Welcome!&quot; · no about page → a machine cannot tell
        who this is.
      </blockquote>
      <blockquote>
        Title: &quot;BrightSolar — Solar Installation in Austin, TX&quot; · H1: &quot;BrightSolar&quot;
        · a real about page · Organization markup → unambiguous identity.
      </blockquote>

      <p>
        Not sure how your site reads today? A free readiness scan resolves your business identity
        the way a machine would and tells you whether it came through clearly — or came back
        &quot;unknown&quot;.
      </p>
    </ArticleLayout>
  );
}
