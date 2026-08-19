"""Assemble the report JSON contract (Free Preview + Full Report)."""

from __future__ import annotations

from pydantic import BaseModel

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

DISCLAIMER = (
    "Measures website readiness and sourceability. Does not measure actual "
    "rankings or visibility in ChatGPT or other AI platforms."
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


def build_report(scan: ScanResult) -> ReportDocument:
    r = scan.readiness
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
    )
