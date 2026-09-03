import { describe, expect, it } from "vitest";

import {
  citationQueries,
  evaluationPrompt,
  kitLanguage,
  measurementPrompt,
} from "@/lib/report/citationTest";
import { crawlLanguageInfo } from "@/lib/report/crawlLanguage";
import { exampleReport } from "@/lib/report/example";
import type { ReportCluster, ReportDocument } from "@/lib/report/types";

function cluster(over: Partial<ReportCluster>): ReportCluster {
  return {
    cluster_key: Math.random().toString(36).slice(2),
    intent: "best_of",
    label: "test",
    priority: 0.9,
    coverage_score: 50,
    sample_prompt: null,
    requirements: [],
    missing_requirements: [],
    ...over,
  };
}

function germanReport(clusters: ReportCluster[]): ReportDocument {
  return {
    ...exampleReport,
    meta: { ...exampleReport.meta, canonical_domain: "besttravelclimate.com" },
    business_profile: {
      ...exampleReport.business_profile,
      brand_name: "BestTravelClimate",
      languages: ["de"],
    },
    clusters,
  };
}

describe("citation kit language", () => {
  it("appends the German search instruction on a German site, not the English one", () => {
    const report = germanReport([
      cluster({ intent: "best_of", sample_prompt: "Was sind die besten Anbieter für Klimadaten?" }),
    ]);
    expect(kitLanguage(report)).toBe("de");
    const qs = citationQueries(report);
    expect(qs).toHaveLength(1);
    expect(qs[0]!.query).toContain("Durchsuche das Web");
    expect(qs[0]!.query).not.toContain("Search the web and answer");
    // The paste prompts are German too.
    expect(measurementPrompt(qs, "de")).toContain("verblindeten KI-Suche-Zitationstest");
    expect(evaluationPrompt("besttravelclimate.com", "de")).toContain("verblindete Phase");
  });

  it("keeps English on an English site", () => {
    const report: ReportDocument = {
      ...germanReport([
        cluster({ intent: "best_of", sample_prompt: "What are the best providers for X data?" }),
      ]),
      business_profile: {
        ...exampleReport.business_profile,
        brand_name: "Acme",
        languages: ["en"],
      },
    };
    expect(kitLanguage(report)).toBe("en");
    expect(citationQueries(report)[0]!.query).toContain("Search the web and answer");
  });
});

describe("citation kit filtering", () => {
  it("drops branded questions and ones left dangling after the brand is stripped", () => {
    const report = germanReport([
      // branded intent -> dropped
      cluster({ intent: "branded", sample_prompt: "Was bietet BestTravelClimate an?" }),
      // best_of whose topic was the brand -> "... für?" after stripping -> dropped
      cluster({ intent: "best_of", sample_prompt: "Was sind die besten Anbieter für BestTravelClimate?" }),
      // a genuine neutral one -> kept
      cluster({
        intent: "recommendation",
        sample_prompt: "Welcher Anbieter für Reiseklima-Daten ist empfehlenswert?",
      }),
    ]);
    const qs = citationQueries(report);
    expect(qs).toHaveLength(1);
    expect(qs[0]!.query).toContain("Reiseklima-Daten");
    // No dangling "für?" or leftover brand anywhere.
    expect(qs.some((q) => /\bfür\?/i.test(q.query))).toBe(false);
    expect(qs.some((q) => /besttravelclimate/i.test(q.query))).toBe(false);
  });
});

describe("crawler-language insight", () => {
  it("flags the crawl language and others for a multilingual site, and matches the question language", () => {
    const report = germanReport([
      cluster({ intent: "recommendation", sample_prompt: "Welcher Anbieter für Klimadaten ist empfehlenswert?" }),
    ]);
    // besttravelclimate case: languages de/en/es/fr, questions in German.
    const rep: ReportDocument = {
      ...report,
      business_profile: { ...report.business_profile, languages: ["de", "en", "es", "fr"] },
    };
    const info = crawlLanguageInfo(rep);
    expect(info).not.toBeNull();
    expect(info!.language).toBe("German");
    expect(info!.others).toEqual(expect.arrayContaining(["English", "Spanish", "French"]));
    expect(info!.others).not.toContain("German");
  });

  it("returns null for a single-language site (no ambiguity)", () => {
    const rep: ReportDocument = {
      ...germanReport([cluster({ intent: "recommendation", sample_prompt: "What is X?" })]),
      business_profile: { ...exampleReport.business_profile, languages: ["en"] },
    };
    expect(crawlLanguageInfo(rep)).toBeNull();
  });
});


describe("citation kit deduplication", () => {
  it("drops a question whose offering is a fuller form of one already asked", () => {
    const report: ReportDocument = {
      ...germanReport([
        cluster({
          intent: "comparison",
          priority: 0.9,
          sample_prompt: "Welche Anbieter für Karibu Saunahaus Monterey sollte man vergleichen?",
        }),
        cluster({
          intent: "comparison",
          priority: 0.8,
          sample_prompt: "Welche Anbieter für Saunahaus Monterey sollte man vergleichen?",
        }),
        cluster({
          intent: "pricing",
          priority: 0.7,
          sample_prompt: "Was kostet eine Gartensauna mit Vorraum?",
        }),
      ]),
      business_profile: { ...exampleReport.business_profile, brand_name: "Sauna Shop", languages: ["de"] },
    };
    const qs = citationQueries(report);
    expect(qs).toHaveLength(2); // the shorter duplicate is dropped
    expect(qs[0]!.query).toContain("Karibu Saunahaus Monterey");
    expect(qs[1]!.query).toContain("Gartensauna");
  });
});

describe("citation kit for a comparison site", () => {
  it("keeps the colon-form category questions intact", () => {
    const report: ReportDocument = {
      ...germanReport([
        cluster({
          intent: "buying_advice",
          priority: 0.83,
          sample_prompt: "Fasssauna: Worauf sollte man beim Kauf achten?",
        }),
        cluster({
          intent: "category_pricing",
          priority: 0.81,
          sample_prompt: "Finnische Sauna: Mit welchen Kosten muss man rechnen?",
        }),
        cluster({
          intent: "buying_advice",
          priority: 0.78,
          sample_prompt: "Finnische Sauna: Worauf sollte man beim Kauf achten?",
        }),
      ]),
      business_profile: {
        ...exampleReport.business_profile,
        brand_name: "Select Your Sauna",
        languages: ["de"],
      },
      meta: { ...exampleReport.meta, canonical_domain: "selectyoursauna.com" },
    };
    const qs = citationQueries(report);
    expect(qs).toHaveLength(3);
    expect(qs[0]!.query).toContain("Fasssauna: Worauf sollte man beim Kauf achten?");
    expect(qs[1]!.query).toContain("Finnische Sauna: Mit welchen Kosten muss man rechnen?");
    // Two categories asking the same thing are distinct questions, not duplicates.
    expect(qs[2]!.query).toContain("Finnische Sauna: Worauf sollte man beim Kauf achten?");
    expect(qs.every((q) => q.query.includes("Durchsuche das Web"))).toBe(true);
  });
});
