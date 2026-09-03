// Crawler-language insight. A multilingual site serves a language-agnostic bot
// (ours, and AI crawlers like GPTBot/PerplexityBot) whatever its default version
// is. That default — not the version the owner sees in their own browser — is
// what gets read and indexed. We surface which language our crawl actually
// retrieved, so a mismatch ("I thought my site was English") becomes visible.
import { kitLanguage } from "@/lib/report/citationTest";
import type { ReportDocument } from "@/lib/report/types";

const LANGUAGE_NAMES: Record<string, string> = {
  de: "German",
  en: "English",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  nl: "Dutch",
  pt: "Portuguese",
  pl: "Polish",
};

function languageName(code: string): string {
  const base = (code.split("-")[0] ?? "").toLowerCase();
  return LANGUAGE_NAMES[base] ?? base.toUpperCase();
}

export interface CrawlLanguageInfo {
  language: string; // display name of the language the crawl retrieved
  others: string[]; // other languages the site also has, as display names
}

/** The crawl-language insight, or null for a single-language site (no mismatch
 *  risk, so nothing to say). */
export function crawlLanguageInfo(report: ReportDocument): CrawlLanguageInfo | null {
  const langs = report.business_profile?.languages ?? [];
  const bases = [...new Set(langs.map((l) => (l.split("-")[0] ?? "").toLowerCase()).filter(Boolean))];
  if (bases.length < 2) return null; // single-language site: no crawler-language ambiguity

  // Questions are generated in English whatever the site's language, so the
  // crawl language comes from the profile. Reports written before that field
  // existed still carry it implicitly: back then the questions WERE in the
  // crawl language, so detecting it from them is the correct fallback.
  const crawl = report.business_profile?.crawl_language || kitLanguage(report);
  const others = bases.filter((b) => b !== crawl).map(languageName);
  return { language: languageName(crawl), others };
}
