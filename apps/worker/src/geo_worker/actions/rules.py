"""Action rules RDY-001..010 (§25).

Priority (§25): impact × confidence × readiness_gap / max(effort, 1).
Deterministic; every action includes evidence; no action claims AI visibility.
"""

from __future__ import annotations

from dataclasses import dataclass

from geo_worker.clusters.types import GeneratedCluster
from geo_worker.coverage.types import ClusterCoverageResult, CoverageReport
from geo_worker.extraction.types import ExtractedPage
from geo_worker.profile.types import BusinessProfile
from geo_worker.scoring.types import ReadinessResult

from .types import Action


@dataclass
class _Ctx:
    readiness: ReadinessResult
    profile: BusinessProfile
    pages: list[ExtractedPage]
    clusters: list[tuple[GeneratedCluster, ClusterCoverageResult]]
    component: dict[str, float]
    substrength: dict[tuple[str, str], float]
    unique_hash_ratio: float
    other_ratio: float

    def gap(self, component: str) -> float:
        return round((100 - self.component.get(component, 0.0)) / 100, 4)

    @property
    def confidence(self) -> float:
        return max(0.3, round(self.readiness.confidence_score / 100, 4))


def _severity(priority: float) -> str:
    if priority >= 0.20:
        return "critical"
    if priority >= 0.10:
        return "high"
    if priority >= 0.05:
        return "medium"
    return "low"


def _make(
    ctx: _Ctx,
    *,
    rule_id: str,
    category: str,
    component: str,
    impact: float,
    effort: int,
    title: str,
    problem: str,
    evidence: list[str],
    recommendation: str,
    expected_signal: str,
    how_to_verify: str,
) -> Action:
    gap = ctx.gap(component)
    priority = round(impact * ctx.confidence * gap / max(effort, 1), 4)
    return Action(
        rule_id=rule_id,
        category=category,
        severity=_severity(priority),
        title=title,
        problem=problem,
        evidence=evidence,
        recommendation=recommendation,
        expected_signal=expected_signal,
        how_to_verify=how_to_verify,
        impact=impact,
        effort=effort,
        confidence=ctx.confidence,
        readiness_gap=gap,
        priority_score=priority,
    )


def _rdy_001(ctx: _Ctx) -> Action | None:
    if not (ctx.profile.needs_confirmation or ctx.component["entity_clarity"] < 70):
        return None
    brand = (
        "unknown (needs confirmation)" if ctx.profile.needs_confirmation else ctx.profile.brand_name
    )
    return _make(
        ctx,
        rule_id="RDY-001",
        category="entity",
        component="entity_clarity",
        impact=0.9,
        effort=2,
        title="Clarify business identity",
        problem="The site's business identity is ambiguous or under-specified.",
        evidence=[
            f"brand_name={brand}",
            f"entity_clarity_score={ctx.component['entity_clarity']}",
            f"legal_name={'present' if ctx.profile.legal_name else 'missing'}",
        ],
        recommendation=(
            "State a single, consistent organization identity (brand name, legal name, "
            "imprint/contact) and add Organization structured data."
        ),
        expected_signal="Higher Entity Clarity and an unambiguous brand across pages.",
        how_to_verify="Re-scan: Entity Clarity rises and the brand no longer needs confirmation.",
    )


def _rdy_002(ctx: _Ctx) -> Action | None:
    dedicated = ctx.substrength.get(("offer_clarity", "dedicated_service_product_pages"), 0.0)
    if not ctx.profile.services or dedicated >= 0.67:
        return None
    return _make(
        ctx,
        rule_id="RDY-002",
        category="offer",
        component="offer_clarity",
        impact=0.8,
        effort=3,
        title="Add dedicated service/product pages",
        problem="Services are named but lack dedicated, detailed landing pages.",
        evidence=[
            f"services={ctx.profile.services}",
            f"dedicated_pages_strength={dedicated}",
        ],
        recommendation="Give each primary service its own page with specific, factual detail.",
        expected_signal="Higher Offer Clarity and stronger per-service evidence depth.",
        how_to_verify="Re-scan: dedicated service/product pages are detected for each service.",
    )


def _rdy_003(ctx: _Ctx) -> Action | None:
    if not ctx.profile.locations:
        return None
    local = [cov.coverage_score for c, cov in ctx.clusters if c.intent == "local"]
    avg = sum(local) / len(local) if local else 0.0
    if local and avg >= 50:
        return None
    return _make(
        ctx,
        rule_id="RDY-003",
        category="local",
        component="prompt_coverage",
        impact=0.7,
        effort=2,
        title="Strengthen local service evidence",
        problem="Locations are stated but service-in-location evidence is weak.",
        evidence=[
            f"locations={ctx.profile.locations}",
            f"local_cluster_avg_coverage={round(avg, 2)}",
        ],
        recommendation="Link services to locations explicitly on the same page (service + city).",
        expected_signal="Higher coverage for local intents.",
        how_to_verify="Re-scan: local cluster coverage increases.",
    )


def _rdy_004(ctx: _Ctx) -> Action | None:
    if ctx.component["sourceability"] >= 60:
        return None
    weak = [n for (c, n), s in ctx.substrength.items() if c == "sourceability" and s < 0.5]
    return _make(
        ctx,
        rule_id="RDY-004",
        category="sourceability",
        component="sourceability",
        impact=0.7,
        effort=3,
        title="Make content more extractable and specific",
        problem="Pages lack specific, attributable, first-party facts.",
        evidence=[
            f"sourceability_score={ctx.component['sourceability']}",
            f"weak_areas={sorted(weak)}",
        ],
        recommendation="Add concrete facts, lists/specifications, dates, and clear Q&A answers.",
        expected_signal="Higher Sourceability from specific, structured content.",
        how_to_verify="Re-scan: Sourceability sub-scores improve.",
    )


def _rdy_005(ctx: _Ctx) -> Action | None:
    org = ctx.substrength.get(("structured_data", "valid_org_identity"), 0.0)
    if ctx.component["structured_data"] >= 60 and org >= 1.0:
        return None
    return _make(
        ctx,
        rule_id="RDY-005",
        category="structured_data",
        component="structured_data",
        impact=0.75,
        effort=2,
        title="Add or complete structured data",
        problem="Organization/offer structured data is missing or incomplete.",
        evidence=[
            f"structured_data_score={ctx.component['structured_data']}",
            f"valid_org_identity_strength={org}",
        ],
        recommendation="Add valid Organization + Service/Product JSON-LD with core fields.",
        expected_signal="Higher Structured Data score.",
        how_to_verify="Re-scan: Organization and Service/Product markup are detected.",
    )


def _rdy_006(ctx: _Ctx) -> Action | None:
    if not ctx.clusters or ctx.component["prompt_coverage"] >= 60:
        return None
    worst = sorted(ctx.clusters, key=lambda cc: cc[1].coverage_score)[:3]
    return _make(
        ctx,
        rule_id="RDY-006",
        category="coverage",
        component="prompt_coverage",
        impact=0.85,
        effort=3,
        title="Close the biggest prompt-coverage gaps",
        problem="The site poorly answers several relevant search intents.",
        evidence=[f"{c.intent}:{round(cov.coverage_score, 1)}" for c, cov in worst],
        recommendation="Add explicit content answering these intents' information needs.",
        expected_signal="Higher Prompt Coverage across the weakest clusters.",
        how_to_verify="Re-scan: coverage for the listed clusters increases.",
    )


def _rdy_007(ctx: _Ctx) -> Action | None:
    if len(ctx.profile.services) < 2:
        return None
    combined = [cov.coverage_score for c, cov in ctx.clusters if c.intent == "combined_service"]
    if combined and max(combined) >= 50:
        return None
    return _make(
        ctx,
        rule_id="RDY-007",
        category="offer",
        component="offer_clarity",
        impact=0.5,
        effort=3,
        title="Show combined-service capability",
        problem="Multiple services exist but their combination is not made explicit.",
        evidence=[f"services={ctx.profile.services[:4]}"],
        recommendation="Add a page showing related services offered together from one source.",
        expected_signal="Coverage for combined-service intents.",
        how_to_verify="Re-scan: a combined-service cluster gains coverage.",
    )


def _rdy_008(ctx: _Ctx) -> Action | None:
    if ctx.component["evidence_trust"] >= 60:
        return None
    types = {p.page_type for p in ctx.pages}
    missing = [t for t in ("about", "contact", "legal", "case_study") if t not in types]
    return _make(
        ctx,
        rule_id="RDY-008",
        category="trust",
        component="evidence_trust",
        impact=0.7,
        effort=3,
        title="Add trust and transparency evidence",
        problem="Trust signals (identity, references, policies) are thin.",
        evidence=[
            f"evidence_trust_score={ctx.component['evidence_trust']}",
            f"missing_page_types={missing}",
        ],
        recommendation="Add about, contact/imprint, references/case studies, and policy pages.",
        expected_signal="Higher Evidence & Trust score.",
        how_to_verify="Re-scan: transparency and reference signals are detected.",
    )


def _rdy_009(ctx: _Ctx) -> Action | None:
    if ctx.unique_hash_ratio >= 0.9 and ctx.other_ratio <= 0.5:
        return None
    return _make(
        ctx,
        rule_id="RDY-009",
        category="technical",
        component="technical_access",
        impact=0.5,
        effort=2,
        title="Resolve duplicate or ambiguous pages",
        problem="Duplicate content or many unclassified pages blur topic identity.",
        evidence=[
            f"unique_content_ratio={round(ctx.unique_hash_ratio, 2)}",
            f"unclassified_page_ratio={round(ctx.other_ratio, 2)}",
        ],
        recommendation="Consolidate duplicates and give each page one clear topic + canonical.",
        expected_signal="More unique, clearly-typed pages.",
        how_to_verify="Re-scan: duplicate ratio drops and page types are clearer.",
    )


def _rdy_010(ctx: _Ctx) -> Action | None:
    server = ctx.substrength.get(("technical_access", "server_visible_meaningful_content"), 0.0)
    if server >= 0.6:
        return None
    return _make(
        ctx,
        rule_id="RDY-010",
        category="technical",
        component="technical_access",
        impact=0.6,
        effort=3,
        title="Serve meaningful content without JS",
        problem="Little meaningful content is present in server-rendered HTML.",
        evidence=[f"server_visible_content_strength={server}"],
        recommendation="Ensure core content is in the server-rendered HTML, not JS-only.",
        expected_signal="Higher Technical Accessibility for server-visible content.",
        how_to_verify="Re-scan: server-rendered pages expose meaningful text.",
    )


_RULES = [
    _rdy_001,
    _rdy_002,
    _rdy_003,
    _rdy_004,
    _rdy_005,
    _rdy_006,
    _rdy_007,
    _rdy_008,
    _rdy_009,
    _rdy_010,
]


def compute_actions(
    readiness: ReadinessResult,
    profile: BusinessProfile,
    coverage: CoverageReport,
    clusters: list[GeneratedCluster],
    pages: list[ExtractedPage],
) -> list[Action]:
    """Run all rules and return evidence-backed actions, highest priority first."""
    component = {c.name: c.score for c in readiness.components}
    substrength = {(c.name, s.name): s.strength for c in readiness.components for s in c.subscores}
    cov_by_key = {cc.cluster_key: cc for cc in coverage.clusters}
    paired = [(c, cov_by_key[c.cluster_key]) for c in clusters if c.cluster_key in cov_by_key]
    n = len(pages)
    ctx = _Ctx(
        readiness=readiness,
        profile=profile,
        pages=pages,
        clusters=paired,
        component=component,
        substrength=substrength,
        unique_hash_ratio=(len({p.content_hash for p in pages}) / n) if n else 1.0,
        other_ratio=(sum(1 for p in pages if p.page_type == "other") / n) if n else 0.0,
    )

    actions = [action for rule in _RULES if (action := rule(ctx)) is not None]
    actions.sort(key=lambda a: (-a.priority_score, a.rule_id))
    return actions
