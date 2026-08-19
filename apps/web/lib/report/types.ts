// TypeScript mirror of the worker's report contract (pipeline/report.py).
// Keep in sync with ReportDocument; the worker is the source of truth.

export interface ReportComponent {
  key: string;
  name: string;
  score: number;
  level: string;
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
}

export interface ReportMeta {
  canonical_domain: string;
  scan_type: string;
  methodology_version: string;
  pages_analyzed: number;
  clusters_evaluated: number;
  confidence_score: number;
  confidence_band: string;
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
}
