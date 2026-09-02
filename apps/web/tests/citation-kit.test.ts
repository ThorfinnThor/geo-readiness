import { describe, expect, it } from "vitest";

import {
  citationQueries,
  evaluationPrompt,
  kitLanguage,
  measurementPrompt,
} from "@/lib/report/citationTest";
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
