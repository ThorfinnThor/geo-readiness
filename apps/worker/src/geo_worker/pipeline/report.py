"""Assemble the report JSON contract (Free Preview + Full Report)."""

from __future__ import annotations

from pydantic import BaseModel

from geo_worker.methodology.v2.stages import STAGE_EXPLANATIONS

from .runner import ScanResult

_COMPONENT_NAMES: dict[str, str] = {
    "entity_clarity": "Entity Clarity",
    "offer_clarity": "Offer Clarity",
    "prompt_coverage": "Prompt Coverage",
    "sourceability": "Sourceability",
    "structured_data": "Structured Data",
    "evidence_trust": "Evidence & Trust",
    "technical_access": "Technical Accessibility",
}

_STAGE_NAMES: dict[str, str] = {
    "retrieval_readiness": "Retrieval Readiness",
    "citation_readiness": "Citation Readiness",
    "answer_extractability": "Answer Extractability",
}

_SIGNAL_LABELS: dict[str, str] = {
    "quantified_information": "specific quantified information",
    "evidence_attribution": "source attribution",
    "semantic_extractability": "extractable structure",
    "direct_answerability": "direct answers",
    "declared_freshness": "freshness signals",
    "author_responsibility": "clear authorship",
    "first_party_evidence_depth": "first-party evidence depth",
    "definition_comparison_procedure": "definitions/comparisons/procedures",
    "stable_topic_identity": "stable topic identity",
}

# §94 — the honest, provider-neutral disclaimer.
DISCLAIMER = (
    "This audit measures deterministic website readiness for retrieval, citation "
    "and answer extraction using research-supported and heuristic proxies. It does "
    "not measure or guarantee rankings, citations, traffic or visibility in "
    "ChatGPT, Gemini, Perplexity or other AI platforms."
)


def score_level(score: float) -> str:
    if score >= 90:
        return "Excellent"
    if score >= 80:
        return "Strong"
    if score >= 65:
        return "Good"
    if score >= 50:
        return "Needs improvement"
    return "Weak"


def confidence_band(score: float) -> str:
    if score >= 85:
        return "High"
    if score >= 70:
        return "Moderate"
    return "Low"


class ReportComponent(BaseModel):
    key: str
    name: str
    score: float
    level: str


class ReportRequirement(BaseModel):
    name: str
    weight: int
    strength: float


class ReportCluster(BaseModel):
    cluster_key: str
    intent: str
    label: str
    priority: float
    coverage_score: float
    sample_prompt: str | None = None
    requirements: list[ReportRequirement] = []
    missing_requirements: list[str] = []


class ReportAction(BaseModel):
    rule_id: str
    title: str
    category: str
    severity: str
    priority_score: float
    problem: str
    recommendation: str
    expected_signal: str
    how_to_verify: str
    evidence: list[str]
    # V2 additive: a paste-ready prompt the user can hand to an AI/developer to
    # implement this one fix. Empty for V1.
    fix_prompt: str = ""


class ReportProfile(BaseModel):
    brand_name: str | None
    needs_confirmation: bool
    legal_name: str | None
    services: list[str]
    products: list[str]
    locations: list[str]
    countries: list[str]
    languages: list[str]


class ReportMeta(BaseModel):
    canonical_domain: str
    scan_type: str
    methodology_version: str
    pages_analyzed: int
    clusters_evaluated: int
    confidence_score: float
    confidence_band: str
    # V2 additive (§89); V1 leaves these null.
    methodology_hash: str | None = None
    as_of: str | None = None


class ReportStage(BaseModel):
    key: str
    name: str
    score: float
    level: str
    explanation: str


class ReportDiagnostic(BaseModel):
    component: str
    strongest_signals: list[str] = []
    limiting_signals: list[str] = []
    explanation: str = ""


class ReportCrawl(BaseModel):
    """Crawl transparency (§v2-plan 5.1): what was actually fetched."""

    status: str
    pages_analyzed: int
    pages_fetched: int
    errors: int
    robots_skipped: int
    homepage_reachable: bool
    robots_blocked_core: bool
    valid_response_ratio: float


class ReportDocument(BaseModel):
    meta: ReportMeta
    overall_score: float
    overall_level: str
    components: list[ReportComponent]
    strengths: list[str]
    gaps: list[str]
    business_profile: ReportProfile
    actions: list[ReportAction]
    clusters: list[ReportCluster]
    disclaimer: str = DISCLAIMER
    # V2 additive (§90–92); empty for V1.
    stages: list[ReportStage] = []
    diagnostics: list[ReportDiagnostic] = []
    # V2 additive: one prompt that bundles every fix, paste-ready. Empty for V1.
    fix_prompt_master: str = ""
    # V2 additive transparency: crawl summary, a provisional flag when crawl
    # coverage is too thin to fully trust the score, and an explained empty-cluster
    # state. All null/empty for V1.
    crawl: ReportCrawl | None = None
    provisional: bool = False
    cluster_note: str = ""


def _build_stages(r) -> list[ReportStage]:
    scores = {
        "retrieval_readiness": r.retrieval_readiness_score,
        "citation_readiness": r.citation_readiness_score,
        "answer_extractability": r.answer_extractability_score,
    }
    stages: list[ReportStage] = []
    for key, name in _STAGE_NAMES.items():
        value = scores[key]
        if value is None:
            continue
        stages.append(
            ReportStage(
                key=key,
                name=name,
                score=value,
                level=score_level(value),
                explanation=STAGE_EXPLANATIONS[key],
            )
        )
    return stages


def _build_diagnostics(r) -> list[ReportDiagnostic]:
    out: list[ReportDiagnostic] = []
    for d in r.component_diagnostics:
        limiting = ", ".join(_SIGNAL_LABELS.get(s, s) for s in d.limiting_signals)
        explanation = (
            f"{d.component.replace('_', ' ').title()} is primarily limited by {limiting}."
            if limiting
            else ""
        )
        out.append(
            ReportDiagnostic(
                component=d.component,
                strongest_signals=d.strongest_signals,
                limiting_signals=d.limiting_signals,
                explanation=explanation,
            )
        )
    return out


_FIX_GUARDRAIL = (
    "Only use facts that are genuinely true of this business. Never invent claims, numbers, "
    "reviews, prices or credentials. Prefer the smallest change that resolves the issue."
)


def _action_fix_prompt(action, domain: str) -> str:
    """A paste-ready prompt for a single fix (V2)."""
    lines = [
        f"You are improving {domain} so AI answer engines can find, trust and quote it.",
        "",
        f"Fix: {action.title}",
        f"Problem: {action.problem}",
        f"Change to make: {action.recommendation}",
        f"How the audit re-checks it: {action.how_to_verify}",
    ]
    if action.evidence:
        lines.append("")
        lines.append("What the audit observed:")
        lines.extend(f"- {e}" for e in action.evidence)
    lines.append("")
    lines.append(
        "Tell me exactly which pages or files to edit and give the concrete markup or copy. "
        + _FIX_GUARDRAIL
    )
    return "\n".join(lines)


def _master_fix_prompt(actions, domain: str) -> str:
    """One prompt bundling every fix, in priority order (V2)."""
    if not actions:
        return ""
    out = [
        f"You are improving {domain} so AI answer engines can find, trust and quote it.",
        "Work through the prioritized fixes below. For each, tell me exactly which pages or files "
        "to edit and give the concrete markup or copy.",
        _FIX_GUARDRAIL,
        "",
        "Fixes, most important first:",
        "",
    ]
    for i, a in enumerate(actions, 1):
        out.append(f"{i}. [{a.severity}] {a.title}")
        out.append(f"   Problem: {a.problem}")
        out.append(f"   Change: {a.recommendation}")
        out.append(f"   Verify: {a.how_to_verify}")
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def _cluster_note(scan: ScanResult) -> str:
    """Explain an empty prompt-cluster set (§v2-plan 7.3) instead of showing 0."""
    if scan.clusters:
        return ""
    p = scan.profile
    missing = []
    if not p.brand_name:
        missing.append("a clear organization identity")
    if not p.services and not p.products:
        missing.append("an identifiable offering (services or products)")
    if not (p.industries or p.services or p.products):
        missing.append("a stable topic")
    reason = ", ".join(missing) if missing else "signals of sufficient confidence"
    return (
        "Prompt modeling could not be completed because the crawl did not yield "
        f"{reason}. Clarify these on the site and re-scan."
    )


def build_report(scan: ScanResult) -> ReportDocument:
    r = scan.readiness
    # These are V2 features; V1 reports leave them empty (frozen output).
    is_v2 = scan.methodology_version != "geo-readiness-v1"
    domain = scan.canonical_domain
    valid_ratio = (
        scan.pages_fetched / (scan.pages_fetched + scan.crawl_errors)
        if (scan.pages_fetched + scan.crawl_errors)
        else 1.0
    )
    crawl = (
        ReportCrawl(
            status=scan.crawl_status,
            pages_analyzed=scan.pages_analyzed,
            pages_fetched=scan.pages_fetched,
            errors=scan.crawl_errors,
            robots_skipped=scan.robots_skipped,
            homepage_reachable=scan.homepage_reachable,
            robots_blocked_core=scan.robots_blocked_core,
            valid_response_ratio=round(valid_ratio, 4),
        )
        if is_v2
        else None
    )
    # Provisional when crawl coverage is too thin to fully trust the score.
    provisional = bool(
        is_v2
        and (
            not scan.homepage_reachable
            or scan.robots_blocked_core
            or valid_ratio < 0.8
            or scan.pages_analyzed == 0
        )
    )
    components = [
        ReportComponent(
            key=key,
            name=name,
            score=getattr(r, f"{key}_score"),
            level=score_level(getattr(r, f"{key}_score")),
        )
        for key, name in _COMPONENT_NAMES.items()
    ]

    ranked = sorted(components, key=lambda c: c.score, reverse=True)
    strengths = [f"{c.name} is strong ({c.score:g}/100)" for c in ranked[:3] if c.score >= 65]
    gaps = [f"{c.name} needs work ({c.score:g}/100)" for c in reversed(ranked[-3:]) if c.score < 80]

    cov_by_key = {cc.cluster_key: cc for cc in scan.coverage.clusters}
    clusters: list[ReportCluster] = []
    for cluster in scan.clusters:
        cov = cov_by_key.get(cluster.cluster_key)
        label = cluster.topic or cluster.service or cluster.product or cluster.intent
        clusters.append(
            ReportCluster(
                cluster_key=cluster.cluster_key,
                intent=cluster.intent,
                label=label,
                priority=cluster.priority,
                coverage_score=cov.coverage_score if cov else 0.0,
                sample_prompt=cluster.prompts[0].prompt_text if cluster.prompts else None,
                requirements=[
                    ReportRequirement(name=rq.name, weight=rq.weight, strength=rq.strength)
                    for rq in (cov.requirements if cov else [])
                ],
                missing_requirements=cov.missing_requirements if cov else [],
            )
        )

    actions = [
        ReportAction(
            rule_id=a.rule_id,
            title=a.title,
            category=a.category,
            severity=a.severity,
            priority_score=a.priority_score,
            problem=a.problem,
            recommendation=a.recommendation,
            expected_signal=a.expected_signal,
            how_to_verify=a.how_to_verify,
            evidence=a.evidence,
            fix_prompt=_action_fix_prompt(a, domain) if is_v2 else "",
        )
        for a in scan.actions
    ]

    profile = ReportProfile(
        brand_name=scan.profile.brand_name,
        needs_confirmation=scan.profile.needs_confirmation,
        legal_name=scan.profile.legal_name,
        services=scan.profile.services,
        products=scan.profile.products,
        locations=scan.profile.locations,
        countries=scan.profile.countries,
        languages=scan.profile.languages,
    )

    meta = ReportMeta(
        canonical_domain=scan.canonical_domain,
        scan_type=scan.scan_type,
        methodology_version=scan.methodology_version,
        pages_analyzed=scan.pages_analyzed,
        clusters_evaluated=len(scan.clusters),
        confidence_score=r.confidence_score,
        confidence_band=confidence_band(r.confidence_score),
        methodology_hash=scan.methodology_hash,
        as_of=scan.as_of.isoformat() if scan.as_of else None,
    )

    return ReportDocument(
        meta=meta,
        overall_score=r.overall_score,
        overall_level=score_level(r.overall_score),
        components=components,
        strengths=strengths,
        gaps=gaps,
        business_profile=profile,
        actions=actions,
        clusters=clusters,
        stages=_build_stages(r),
        diagnostics=_build_diagnostics(r),
        fix_prompt_master=_master_fix_prompt(scan.actions, domain) if is_v2 else "",
        crawl=crawl,
        provisional=provisional,
        cluster_note=_cluster_note(scan) if is_v2 else "",
    )
