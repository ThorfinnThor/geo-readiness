// TypeScript mirror of the worker's report contract (pipeline/report.py).
// Keep in sync with ReportDocument; the worker is the source of truth.

export interface ReportComponent {
  key: string;
  name: string;
  score: number;
  level: string; // "N/A" when not applicable
  applicable?: boolean;
}

export interface ReportRequirement {
  name: string;
  weight: number;
  strength: number;
}

export interface ReportCluster {
  cluster_key: string;
  intent: string;
  label: string;
  priority: number;
  coverage_score: number;
  sample_prompt: string | null;
  requirements: ReportRequirement[];
  missing_requirements: string[];
}

export interface ReportAction {
  rule_id: string;
  title: string;
  category: string;
  severity: string;
  priority_score: number;
  problem: string;
  recommendation: string;
  expected_signal: string;
  how_to_verify: string;
  evidence: string[];
  fix_prompt?: string;
}

export interface ReportProfile {
  brand_name: string | null;
  needs_confirmation: boolean;
  legal_name: string | null;
  services: string[];
  products: string[];
  locations: string[];
  countries: string[];
  languages: string[];
  site_type?: string;
}

export interface ReportMeta {
  canonical_domain: string;
  scan_type: string;
  methodology_version: string;
  pages_analyzed: number;
  clusters_evaluated: number;
  confidence_score: number;
  confidence_band: string;
  // V2 additive; null/undefined for V1.
  methodology_hash?: string | null;
  as_of?: string | null;
}

// V2 additive (§90–92). Empty for V1 reports.
export interface ReportStage {
  key: string;
  name: string;
  score: number;
  level: string;
  explanation: string;
}

export interface ReportDiagnostic {
  component: string;
  strongest_signals: string[];
  limiting_signals: string[];
  explanation: string;
}

export interface ReportDocument {
  meta: ReportMeta;
  overall_score: number;
  overall_level: string;
  components: ReportComponent[];
  strengths: string[];
  gaps: string[];
  business_profile: ReportProfile;
  actions: ReportAction[];
  clusters: ReportCluster[];
  disclaimer: string;
  // V2 additive; default to [] when absent.
  stages?: ReportStage[];
  diagnostics?: ReportDiagnostic[];
  fix_prompt_master?: string;
  crawl?: ReportCrawl | null;
  provisional?: boolean;
  cluster_note?: string;
  language_coverage?: ReportLanguageCoverage[];
}

export interface ReportLanguageCoverage {
  language: string;
  pages: number;
  prompt_coverage_score: number;
}

export interface ReportCrawl {
  status: string;
  pages_analyzed: number;
  pages_fetched: number;
  errors: number;
  robots_skipped: number;
  homepage_reachable: boolean;
  robots_blocked_core: boolean;
  valid_response_ratio: number;
  /** Documented AI crawler token -> allowed at the site root. Absent on reports
   *  written before the check existed. */
  ai_crawler_access?: Record<string, boolean>;
}
