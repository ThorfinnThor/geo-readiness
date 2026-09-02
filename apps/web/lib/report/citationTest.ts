// AI Citation Self-Test kit. The audit scores readiness deterministically and
// makes no AI-provider calls; this kit lets the site owner run the *actual*
// citation test themselves in ChatGPT or Claude with the neutral questions the
// engine already generated. Readiness and real citation are different layers, so
// the copy always says a miss is not proof a page is weak.
//
// The kit deliberately keeps the measurement blinded: the target domain is NOT
// in the first (measurement) prompt, only in the second (evaluation) prompt, so
// the model finds and cites the site on its own rather than being told to.
import type { ReportDocument } from "@/lib/report/types";

const SEARCH_SUFFIX =
  "Search the web and answer using current, credible sources. Cite the sources you rely on.";

export interface CitationQuery {
  qid: string; // Q01, Q02, …
  intent: string;
  query: string;
}

/** Strip the brand and domain out of a generated question and append the
 *  "search the web + cite sources" instruction, so the query is neutral and
 *  cannot simply point the model back at the site under test. */
function neutralize(raw: string, brand: string | null, domain: string): string {
  let q = raw.trim();
  const needles = new Set<string>();
  if (brand) needles.add(brand);
  if (domain) {
    needles.add(domain);
    const core = domain.split(".")[0]; // "brightsolar" from "brightsolar.example"
    if (core && core.length > 2) needles.add(core);
  }
  for (const n of needles) {
    if (!n) continue;
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    q = q.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "").replace(/\s{2,}/g, " ").trim();
  }
  q = q.replace(/\s+([?.!,])/g, "$1").trim();
  if (!/cite the sources/i.test(q)) q = `${q} ${SEARCH_SUFFIX}`;
  return q;
}

/** The neutral test questions, most important first, from the report's clusters. */
export function citationQueries(report: ReportDocument, limit = 8): CitationQuery[] {
  const brand = report.business_profile?.brand_name ?? null;
  const domain = report.meta.canonical_domain;
  const out: CitationQuery[] = [];
  const sorted = [...report.clusters]
    .filter((c) => typeof c.sample_prompt === "string" && c.sample_prompt.trim() !== "")
    .sort((a, b) => b.priority - a.priority);
  for (const c of sorted) {
    if (out.length >= limit) break;
    const query = neutralize(c.sample_prompt as string, brand, domain);
    if (query.replace(SEARCH_SUFFIX, "").trim().length < 8) continue; // too little left after stripping
    out.push({
      qid: `Q${String(out.length + 1).padStart(2, "0")}`,
      intent: c.intent,
      query,
    });
  }
  return out;
}

/** One neutral question, for the free-preview teaser. */
export function sampleCitationQuery(report: ReportDocument): string | null {
  return citationQueries(report, 1)[0]?.query ?? null;
}

/** Step 1 (paste first): blinded measurement. The domain is intentionally absent. */
export function measurementPrompt(queries: CitationQuery[]): string {
  const qlist = queries.map((q, i) => `${i + 1}. ${q.query}`).join("\n");
  return `You are running a blinded AI-search citation test. You will get ${queries.length} independent user questions. The website being tested is intentionally hidden from you, do not try to guess it.

Rules
- Treat every question as its own separate search task.
- Do a fresh web search for each question.
- Do not reuse sources from one question to answer another.
- List only the sources you actually used for that question, each with its full URL.
- Do not invent or guess URLs. If you did not search for a question, write NO_SEARCH.

Questions
${qlist}

For each question: answer it normally, then add a "Sources used" list with the full URL of every source. Do the searches now and keep the per-question sources. We will evaluate them in the next message.`;
}

/** Step 2 (paste after step 1's answer): reveal the domain and evaluate, no new search. */
export function evaluationPrompt(domain: string): string {
  return `The blinded phase is done. Do NOT run any new web searches, and do NOT add any source that was not already in your previous answer.

The website that was being tested is: ${domain}

Using only the sources you already listed, for each question tell me:
- Was ${domain} cited at all (any page on that domain)? YES or NO.
- If yes, which exact URL was cited?
- Which other domains were cited instead?

Then give me, counting only questions where you actually searched:
- Domain citation rate = questions where ${domain} was cited / questions with a real search.
- Note any question where a less relevant page of ${domain} was cited instead of the obvious one.

Keep it factual and based only on the sources already listed. A question with NO_SEARCH does not count against the rate.`;
}

/** The full "pro" protocol, tailored to this site, offered as a Markdown download. */
export function proProtocolMarkdown(report: ReportDocument): string {
  const domain = report.meta.canonical_domain;
  const brand = report.business_profile?.brand_name ?? "(your brand)";
  const queries = citationQueries(report, 10);
  const manifest = queries
    .map((q) => `### ${q.qid}\n\nINTENT: ${q.intent}\n\nQUESTION:\n${q.query}`)
    .join("\n\n");
  const mapping = queries.map((q) => `${q.qid} → ${domain}`).join("\n");

  return `# AI Citation Self-Test Protocol — ${domain}

Generated by Find Your AI Score. This measures ACTUAL citation in ChatGPT and
Claude, which is different from the readiness score. A page that is not cited is
not necessarily weak: authority, age and competition all matter, and results vary
between runs. Use this to see the live status and to compare before and after you
apply the fixes.

Target domain: ${domain}
Brand: ${brand}

## Why the two-step, blinded design

The model must not know which site is being tested before it searches, otherwise
you measure "can it fetch a named page" instead of "does it find and cite you on
its own". So step 1 (measurement) never mentions your domain; step 2 (evaluation)
reveals it and must not trigger a new search.

## For the strictest run

Run each question in its own fresh, empty chat (no prior context, no brand or
domain anywhere), then evaluate. The batch below shares one conversation, which is
faster but less independent. Mark strict runs as independent_sessions: true.

## Step 1 — paste into a new, empty ChatGPT or Claude chat

${measurementPrompt(queries)}

## Step 2 — paste into the SAME chat, after step 1 has answered

${evaluationPrompt(domain)}

## Test questions (mapping, keep private until step 2)

${mapping}

## The full question manifest

${manifest}

## How to read the result

- Domain cited = any page of ${domain} appeared as a source.
- Exact page cited = the specific relevant page was the source, not just the homepage.
- A brand mention in the answer text with no source URL does not count as a citation.
- Exclude NO_SEARCH and failed questions from the rate.

## Limitations

- One batch at one point in time; results vary across runs, models, locales and dates.
- This is not an official or permanent ranking.
- A missing citation does not by itself prove poor page quality.
- Readiness (what the score measures) and citation (what this measures) are different layers.
`;
}
