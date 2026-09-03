// AI Citation Self-Test kit. The audit scores readiness deterministically and
// makes no AI-provider calls; this kit lets the site owner run the *actual*
// citation test themselves in ChatGPT or Claude with the neutral questions the
// engine already generated. Readiness and real citation are different layers, so
// the copy always says a miss is not proof a page is weak.
//
// The kit deliberately keeps the measurement blinded: the target domain is NOT
// in the first (measurement) prompt, only in the second (evaluation) prompt, so
// the model finds and cites the site on its own rather than being told to.
//
// The engine generates every question of a scan in ONE language (the site's), so
// the whole kit — the search instruction, both paste prompts and the protocol —
// is emitted in that language to avoid a German question with an English tail.
import type { ReportDocument } from "@/lib/report/types";

export type KitLang = "en" | "de";

const SEARCH_SUFFIX: Record<KitLang, string> = {
  en: "Search the web and answer using current, credible sources. Cite the sources you rely on.",
  de: "Durchsuche das Web und antworte anhand aktueller, glaubwürdiger Quellen. Zitiere die Quellen, auf die du dich stützt.",
};
const CITE_MARKER: Record<KitLang, RegExp> = {
  en: /cite the sources/i,
  de: /zitiere die quellen/i,
};

// A question left dangling on a preposition/article after the brand was stripped
// ("Was bietet an?", "Was sind die besten Anbieter für?") is dropped, not shown.
const DANGLING_TAIL = new Set([
  "für",
  "zu",
  "an",
  "in",
  "mit",
  "von",
  "bei",
  "um",
  "auf",
  "über",
  "der",
  "die",
  "das",
  "den",
  "dem",
  "ein",
  "eine",
  "einen",
  "und",
  "oder",
  "for",
  "to",
  "of",
  "about",
  "with",
  "by",
  "on",
  "at",
  "the",
  "a",
  "an",
  "and",
  "or",
]);

export interface CitationQuery {
  qid: string; // Q01, Q02, …
  intent: string;
  query: string;
}

/** The language the engine generated this scan's questions in. Detected from the
 *  actual generated questions (a scan's questions are all one language), because
 *  the worker generates in the site's dominant language, which need not be the
 *  first entry in business_profile.languages. Falls back to the profile list. */
export function kitLanguage(report: ReportDocument): KitLang {
  const text = report.clusters
    .map((c) => c.sample_prompt ?? "")
    .join(" ")
    .toLowerCase();
  const de = (
    text.match(/\b(was|welche|welcher|über|für|wie|sollte|man|anbieter|quellen|erfahren)\b/g) ?? []
  ).length;
  const en = (
    text.match(/\b(what|which|how|should|providers|sources|about|best|learn|know)\b/g) ?? []
  ).length;
  if (de > en) return "de";
  if (en > de) return "en";
  for (const lg of report.business_profile?.languages ?? []) {
    const base = (lg.split("-")[0] ?? "").toLowerCase();
    if (base === "de") return "de";
    if (base === "en") return "en";
  }
  return "en";
}

function domainCore(domain: string): string {
  return (domain.split(".")[0] ?? "").toLowerCase();
}

/** Strip the brand and domain out of a generated question and append the
 *  language-matched "search + cite" instruction. */
function neutralize(raw: string, brand: string | null, domain: string, lang: KitLang): string {
  let q = raw.trim();
  const needles = new Set<string>();
  if (brand) needles.add(brand);
  if (domain) {
    needles.add(domain);
    const core = domainCore(domain);
    if (core && core.length > 2) needles.add(core);
  }
  for (const n of needles) {
    if (!n) continue;
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    q = q.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "").replace(/\s{2,}/g, " ").trim();
  }
  q = q.replace(/\s+([?.!,])/g, "$1").trim();
  if (!CITE_MARKER[lang].test(q)) q = `${q} ${SEARCH_SUFFIX[lang]}`;
  return q;
}

/** True if the neutral question is a well-formed, genuinely blind question: not
 *  branded, not dangling, and no longer naming the brand or domain. */
function isWellFormed(core: string, brand: string | null, domain: string): boolean {
  const q = core.replace(/[?？]+\s*$/, "").trim();
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length < 4) return false;
  const last = (words[words.length - 1] ?? "").toLowerCase().replace(/[.,:;!?"']/g, "");
  if (DANGLING_TAIL.has(last)) return false;
  const low = q.toLowerCase();
  if (brand && brand.trim() && low.includes(brand.toLowerCase())) return false;
  const core2 = domainCore(domain);
  if (core2.length > 2 && low.includes(core2)) return false;
  return true;
}

/** Two questions asking the same thing, because one offering is a fuller form of
 *  the other ("Karibu Saunahaus Monterey" vs "Saunahaus Monterey"). */
function nearDuplicate(core: string, accepted: string[]): boolean {
  const words = (v: string) =>
    new Set(
      v
        .toLowerCase()
        .replace(/[?.!,:;"'()]/g, " ")
        .split(/\s+/)
        .filter(Boolean),
    );
  const a = words(core);
  for (const other of accepted) {
    const b = words(other);
    const smaller = a.size <= b.size ? a : b;
    const larger = a.size <= b.size ? b : a;
    let shared = 0;
    for (const w of smaller) if (larger.has(w)) shared += 1;
    if (smaller.size > 0 && shared === smaller.size) return true;
  }
  return false;
}

/** The neutral test questions, most important first, from the report's clusters. */
export function citationQueries(report: ReportDocument, limit = 8): CitationQuery[] {
  const brand = report.business_profile?.brand_name ?? null;
  const domain = report.meta.canonical_domain;
  const lang = kitLanguage(report);
  const out: CitationQuery[] = [];
  const accepted: string[] = [];
  const sorted = [...report.clusters]
    .filter(
      (c) =>
        c.intent !== "branded" && typeof c.sample_prompt === "string" && c.sample_prompt.trim() !== "",
    )
    .sort((a, b) => b.priority - a.priority);
  for (const c of sorted) {
    if (out.length >= limit) break;
    const query = neutralize(c.sample_prompt as string, brand, domain, lang);
    const core = query.replace(SEARCH_SUFFIX[lang], "").trim();
    if (!isWellFormed(core, brand, domain)) continue;
    if (nearDuplicate(core, accepted)) continue;
    accepted.push(core);
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
export function measurementPrompt(queries: CitationQuery[], lang: KitLang): string {
  const n = queries.length;
  const qlist = queries.map((q, i) => `${i + 1}. ${q.query}`).join("\n");
  if (lang === "de") {
    const noun = n === 1 ? "1 unabhängige Nutzerfrage" : `${n} unabhängige Nutzerfragen`;
    return `Du führst einen verblindeten KI-Suche-Zitationstest durch. Du bekommst ${noun}. Die getestete Website ist absichtlich verborgen, versuche nicht, sie zu erraten.

Regeln
- Behandle jede Frage als eigene, getrennte Suchaufgabe.
- Führe für jede Frage eine frische Websuche durch.
- Übernimm keine Quellen von einer Frage in eine andere.
- Liste nur die Quellen, die du für diese Frage tatsächlich verwendet hast, jeweils mit vollständiger URL.
- Erfinde oder rate keine URLs. Wenn du für eine Frage nicht gesucht hast, schreibe NO_SEARCH.

Fragen
${qlist}

Beantworte jede Frage normal und füge dann eine Liste „Verwendete Quellen" mit der vollständigen URL jeder Quelle an. Führe die Suchen jetzt durch und behalte die Quellen je Frage. Wir werten sie in der nächsten Nachricht aus.`;
  }
  const enNoun = n === 1 ? "1 independent user question" : `${n} independent user questions`;
  return `You are running a blinded AI-search citation test. You will get ${enNoun}. The website being tested is intentionally hidden from you, do not try to guess it.

Rules
- Treat every question as its own separate search task.
- Do a fresh web search for every question.
- Do not reuse sources from one question to answer another.
- List only the sources you actually used for that question, each with its full URL.
- Do not invent or guess URLs. If you did not search for a question, write NO_SEARCH.

Questions
${qlist}

For each question: answer it normally, then add a "Sources used" list with the full URL of every source. Do the searches now and keep the per-question sources. We will evaluate them in the next message.`;
}

/** Step 2 (paste after step 1's answer): reveal the domain and evaluate, no new search. */
export function evaluationPrompt(domain: string, lang: KitLang): string {
  if (lang === "de") {
    return `Die verblindete Phase ist abgeschlossen. Führe KEINE neue Websuche durch und füge KEINE Quelle hinzu, die nicht schon in deiner vorherigen Antwort stand.

Die getestete Website war: ${domain}

Sag mir für jede Frage, ausschließlich anhand der bereits gelisteten Quellen:
- Wurde ${domain} überhaupt zitiert (irgendeine Seite dieser Domain)? JA oder NEIN.
- Falls ja, welche genaue URL wurde zitiert?
- Welche anderen Domains wurden stattdessen zitiert?

Gib mir dann, gezählt nur über Fragen mit echter Suche:
- Domain-Zitationsrate = Fragen, in denen ${domain} zitiert wurde / Fragen mit echter Suche.
- Nenne jede Frage, in der eine weniger relevante Seite von ${domain} statt der naheliegenden zitiert wurde.

Bleibe faktisch und stütze dich nur auf die bereits gelisteten Quellen. Eine Frage mit NO_SEARCH zählt nicht gegen die Rate.`;
  }
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
  const lang = kitLanguage(report);
  const queries = citationQueries(report, 10);
  const mapping = queries.map((q) => `${q.qid} → ${domain}`).join("\n");
  const manifest = queries
    .map((q) => `### ${q.qid}\n\nINTENT: ${q.intent}\n\n${lang === "de" ? "FRAGE" : "QUESTION"}:\n${q.query}`)
    .join("\n\n");

  if (lang === "de") {
    return `# KI-Zitations-Selbsttest — ${domain}

Erstellt von Find Your AI Score. Dies misst die TATSÄCHLICHE Zitation in ChatGPT
und Claude, was etwas anderes ist als der Readiness-Score. Eine nicht zitierte
Seite ist nicht automatisch schwach: Autorität, Alter und Wettbewerb spielen mit,
und die Ergebnisse schwanken zwischen Durchläufen. Nutze das, um den Live-Status
zu sehen und Vorher/Nachher zu vergleichen.

Ziel-Domain: ${domain}

## Warum der zweistufige, verblindete Aufbau

Das Modell darf vor der Suche nicht wissen, welche Seite getestet wird, sonst
misst du „kann es eine genannte Seite abrufen" statt „findet und zitiert es dich
von selbst". Deshalb nennt Schritt 1 (Messung) deine Domain nie; Schritt 2
(Auswertung) enthüllt sie und darf keine neue Suche auslösen.

## Für den strengsten Durchlauf

Führe jede Frage in einem eigenen, frischen, leeren Chat aus (kein Kontext, keine
Marke oder Domain), dann werte aus. Der Batch unten teilt sich einen Chat, das ist
schneller, aber weniger unabhängig.

## Schritt 1 — in einen neuen, leeren ChatGPT- oder Claude-Chat einfügen

${measurementPrompt(queries, lang)}

## Schritt 2 — nach der Antwort in DENSELBEN Chat einfügen

${evaluationPrompt(domain, lang)}

## Testfragen (Zuordnung, bis Schritt 2 geheim halten)

${mapping}

## Vollständiges Fragen-Manifest

${manifest}

## Ergebnis lesen

- Domain zitiert = irgendeine Seite von ${domain} war eine Quelle.
- Exakte Seite zitiert = die konkret relevante Seite war die Quelle, nicht nur die Startseite.
- Eine reine Markennennung im Antworttext ohne Quell-URL zählt nicht als Zitation.
- NO_SEARCH- und fehlgeschlagene Fragen aus der Rate ausschließen.

## Grenzen

- Ein Batch zu einem Zeitpunkt; Ergebnisse variieren je Durchlauf, Modell, Region und Datum.
- Kein offizielles oder dauerhaftes Ranking.
- Eine fehlende Zitation beweist für sich genommen keine schlechte Seitenqualität.
- Readiness (was der Score misst) und Zitation (was dies misst) sind verschiedene Ebenen.
`;
  }

  return `# AI Citation Self-Test Protocol — ${domain}

Generated by Find Your AI Score. This measures ACTUAL citation in ChatGPT and
Claude, which is different from the readiness score. A page that is not cited is
not necessarily weak: authority, age and competition all matter, and results vary
between runs. Use this to see the live status and to compare before and after you
apply the fixes.

Target domain: ${domain}

## Why the two-step, blinded design

The model must not know which site is being tested before it searches, otherwise
you measure "can it fetch a named page" instead of "does it find and cite you on
its own". So step 1 (measurement) never mentions your domain; step 2 (evaluation)
reveals it and must not trigger a new search.

## For the strictest run

Run each question in its own fresh, empty chat (no prior context, no brand or
domain anywhere), then evaluate. The batch below shares one conversation, which is
faster but less independent.

## Step 1 — paste into a new, empty ChatGPT or Claude chat

${measurementPrompt(queries, lang)}

## Step 2 — paste into the SAME chat, after step 1 has answered

${evaluationPrompt(domain, lang)}

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
