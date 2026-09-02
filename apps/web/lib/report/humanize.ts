// Display-only polish for offering names, which the engine stores lowercased for
// stable dedup/keys/hash. Mirrors the worker's _humanize_offering so the raw
// service/product/label surfaces read the same as the generated questions:
// known acronyms re-cased, a leading article dropped. Never mutates report data.
const ARTICLES = ["the ", "a ", "an "];
const ACRONYMS: Record<string, string> = {
  ai: "AI",
  seo: "SEO",
  geo: "GEO",
  api: "API",
  saas: "SaaS",
  b2b: "B2B",
  b2c: "B2C",
  crm: "CRM",
  erp: "ERP",
  hr: "HR",
  it: "IT",
  ux: "UX",
  ui: "UI",
  kpi: "KPI",
  roi: "ROI",
  llm: "LLM",
  iot: "IoT",
  pdf: "PDF",
};

export function humanizeOffering(value: string): string {
  let v = value.trim();
  const low = v.toLowerCase();
  for (const art of ARTICLES) {
    if (low.startsWith(art)) {
      v = v.slice(art.length).trim();
      break;
    }
  }
  return v
    .split(/\s+/)
    .map((tok) => ACRONYMS[tok.toLowerCase()] ?? tok)
    .join(" ");
}

/** Humanize a comma-joined list of offerings, preserving the "None" fallback. */
export function humanizeOfferingList(values: string[], fallback = "None"): string {
  return values.map(humanizeOffering).join(", ") || fallback;
}
