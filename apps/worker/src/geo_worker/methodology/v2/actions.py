"""V2 action rules (§77–85).

Builds on V1's deterministic priority (impact × confidence × gap / effort). The
generic RDY-004 is split into signal-specific RDY-004A–D; RDY-011 (topical),
RDY-012 (freshness) and RDY-013 (responsibility) are added. Actions are
de-duplicated by semantic family — at most one per family (§85).
"""

from __future__ import annotations

from geo_worker.actions import compute_actions as compute_actions_v1
from geo_worker.actions.types import Action
from geo_worker.clusters.types import GeneratedCluster
from geo_worker.coverage.types import CoverageReport
from geo_worker.extraction.types import ExtractedPage
from geo_worker.profile.site_type import NON_COMMERCIAL_SITE_TYPES
from geo_worker.profile.types import BusinessProfile
from geo_worker.scoring.types import ReadinessResult

# Base rule → family (so a base action and a new action about the same thing collapse).
_BASE_FAMILY = {"RDY-004": "sourceability"}

# Content/data archetypes where Offer Clarity is not applicable (scored N/A). They
# get Dataset/Article advice, not Service/Product, and no commercial offer action.
_NON_COMMERCIAL = NON_COMMERCIAL_SITE_TYPES

# Clearer, more concrete wording for the base V1 actions (V2 only; V1 stays frozen).
# The report is only as clear as these strings — and the fix prompts are built from
# them — so they name the exact pages, fields and schema to add.
_V2_TEXT_OVERRIDES: dict[str, dict[str, str]] = {
    "RDY-001": {
        "recommendation": (
            "State one consistent business name in the page title and an <h1>, add an About page "
            "and a Contact or imprint page, and confirm the identity with Organization structured "
            "data (name, url, logo, sameAs)."
        ),
    },
    "RDY-005": {  # commercial sites; the non-commercial rewrite below wins for data sites
        "recommendation": (
            "Add valid Organization JSON-LD (name, url, logo, contactPoint), and add Service or "
            "Product schema for what you offer, or SoftwareApplication for an online tool. Put "
            "the schema on the relevant pages, not only the homepage."
        ),
    },
    "RDY-008": {
        "recommendation": (
            "Add the trust pages you probably already have content for: About, Contact or imprint, "
            "a privacy or policy page, and references or case studies where they genuinely apply."
        ),
    },
}

# Site-type-aware rewrite of the structured-data action (RDY-005): a data/content
# site should be told to add Dataset/Article schema, not Service/Product.
_RDY005_NON_COMMERCIAL = {
    "problem": (
        "Organization structured data is missing or incomplete, and the site's content is not "
        "described in machine-readable schema."
    ),
    "recommendation": (
        "Add a valid Organization node, and describe your content with the schema that fits it: "
        "Dataset for a published dataset, or Article / CollectionPage for editorial or reference "
        "content. Do not add Service or Product markup unless you actually sell those."
    ),
    "how_to_verify": "Re-scan: Organization and content schema (Dataset/Article) are detected.",
}


def _severity(priority: float) -> str:
    if priority >= 0.20:
        return "critical"
    if priority >= 0.10:
        return "high"
    if priority >= 0.05:
        return "medium"
    return "low"


def _make(
    *,
    rule_id: str,
    family: str,
    category: str,
    component_score: float,
    confidence: float,
    impact: float,
    effort: int,
    title: str,
    problem: str,
    evidence: list[str],
    recommendation: str,
    expected_signal: str,
    how_to_verify: str,
) -> tuple[str, Action]:
    gap = round((100 - component_score) / 100, 4)
    priority = round(impact * confidence * gap / max(effort, 1), 4)
    return family, Action(
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
        confidence=confidence,
        readiness_gap=gap,
        priority_score=priority,
    )


def compute_actions(
    readiness: ReadinessResult,
    profile: BusinessProfile,
    coverage: CoverageReport,
    clusters: list[GeneratedCluster],
    pages: list[ExtractedPage],
) -> list[Action]:
    confidence = max(0.3, round(readiness.confidence_score / 100, 4))
    source = next((c for c in readiness.components if c.name == "sourceability"), None)
    source_score = source.score if source else 0.0
    sub = {s.name: s.strength for s in source.subscores} if source else {}
    prompt_coverage = readiness.prompt_coverage_score

    families: list[tuple[str, Action]] = []
    non_commercial = profile.site_type in _NON_COMMERCIAL

    # Base V1 actions, minus the generic RDY-004 (superseded by RDY-004A–D) and the
    # combined RDY-009 (split below into two independent findings).
    for action in compute_actions_v1(readiness, profile, coverage, clusters, pages):
        if action.rule_id in ("RDY-004", "RDY-009"):
            continue
        if action.rule_id == "RDY-005" and non_commercial:
            action = action.model_copy(update=_RDY005_NON_COMMERCIAL)
        elif action.rule_id in _V2_TEXT_OVERRIDES:
            action = action.model_copy(update=_V2_TEXT_OVERRIDES[action.rule_id])
        families.append((_BASE_FAMILY.get(action.rule_id, action.rule_id), action))

    def sourceability_action(rule_id, family, signal, impact, title, problem, rec, expected):
        strength = sub.get(signal)
        if strength is None or strength >= 0.5:
            return
        families.append(
            _make(
                rule_id=rule_id,
                family=family,
                category="sourceability",
                component_score=source_score,
                confidence=confidence,
                impact=impact,
                effort=3,
                title=title,
                problem=problem,
                evidence=[f"{signal}_strength={strength}", f"sourceability={source_score}"],
                recommendation=rec,
                expected_signal=expected,
                how_to_verify=f"Re-scan: {signal} improves.",
            )
        )

    sourceability_action(
        "RDY-004A",
        "quantified_evidence",
        "quantified_information",
        0.75,
        "Add concrete quantified information",
        "Pages lack specific figures where they would support the topic.",
        "Add concrete prices, percentages, specifications, measurements, counts or "
        "outcome figures where they genuinely support the page.",
        "Higher quantified-information density on relevant pages.",
    )
    sourceability_action(
        "RDY-004B",
        "evidence_attribution",
        "evidence_attribution",
        0.7,
        "Attribute claims to identifiable sources",
        "Externally verifiable claims are not attributed to sources.",
        "Attribute important externally verifiable claims to identifiable sources and "
        "link the supporting material where appropriate.",
        "Higher evidence attribution from named/linked sources.",
    )
    sourceability_action(
        "RDY-004C",
        "semantic_extractability",
        "semantic_extractability",
        0.7,
        "Present content in extractable structures",
        "Specifications, comparisons and processes are not in extractable structures.",
        "Present genuine specifications, comparisons and processes using semantic "
        "tables, lists or definition structures where they fit.",
        "Higher semantic extractability from real structures.",
    )
    sourceability_action(
        "RDY-004D",
        "direct_answerability",
        "direct_answerability",
        0.7,
        "Add concise direct answers",
        "High-priority questions lack concise, extractable answers.",
        "Add concise answer passages for high-priority customer questions. "
        "A dedicated FAQ page is not required.",
        "More direct-answer blocks for common questions.",
    )
    sourceability_action(
        "RDY-012",
        "freshness",
        "declared_freshness",
        0.5,
        "Add accurate freshness metadata",
        "Time-sensitive content lacks accurate publication/update metadata.",
        "Add accurate publication/update metadata and visibly maintain time-sensitive "
        "content. Never change timestamps merely to look fresh.",
        "Valid, recent dates on freshness-relevant pages.",
    )
    sourceability_action(
        "RDY-013",
        "responsibility",
        "author_responsibility",
        0.5,
        "Identify who is responsible for editorial content",
        "Editorial/guide/reference content does not identify a responsible person or organization.",
        "Identify the person or organization responsible for editorial, guide or "
        "reference content.",
        "Clear authorship on applicable pages.",
    )

    # RDY-011 topical alignment (priority cluster with strong requirements but weak alignment).
    cov = {cc.cluster_key: cc for cc in coverage.clusters}
    gaps = [
        (c, cov[c.cluster_key])
        for c in sorted(clusters, key=lambda c: -c.priority)
        if c.cluster_key in cov
        and cov[c.cluster_key].requirements_score >= 50
        and cov[c.cluster_key].topical_alignment_score < 50
    ]
    if gaps:
        worst = gaps[:3]
        families.append(
            _make(
                rule_id="RDY-011",
                family="topical_alignment",
                category="coverage",
                component_score=prompt_coverage,
                confidence=confidence,
                impact=0.8,
                effort=3,
                title="Make the strongest page address the query directly",
                problem=(
                    "Relevant pages exist but do not clearly address the query's "
                    "service, product, audience or location."
                ),
                evidence=[
                    f"{c.intent}:{cv.best_supporting_url or '-'} align={cv.topical_alignment_score}"
                    for c, cv in worst
                ],
                recommendation=(
                    "Improve the title, H1 and relevant sections of the strongest "
                    "candidate page to address the service, product, audience or "
                    "location — without repeating keywords unnaturally."
                ),
                expected_signal="Higher topical alignment on the candidate page.",
                how_to_verify="Re-scan: topical alignment for these clusters increases.",
            )
        )

    # RDY-009 split (§v2-plan 4.3): duplicate content and low page-type classification
    # are independent problems. A site with fully unique content but many unclassified
    # pages must NOT be told it has duplicate content.
    n = len(pages)
    unique_hash_ratio = (len({p.content_hash for p in pages}) / n) if n else 1.0
    other_ratio = (sum(1 for p in pages if p.page_type == "other") / n) if n else 0.0
    tech_score = next((c.score for c in readiness.components if c.name == "technical_access"), 0.0)
    if unique_hash_ratio < 0.9:
        families.append(
            _make(
                rule_id="RDY-009A",
                family="duplicate_content",
                category="technical",
                component_score=tech_score,
                confidence=confidence,
                impact=0.5,
                effort=2,
                title="Consolidate duplicate content",
                problem="Several pages share near-identical content, which blurs topic identity.",
                evidence=[f"unique_content_ratio={round(unique_hash_ratio, 2)}"],
                recommendation=(
                    "Consolidate or genuinely differentiate the duplicate pages and set a "
                    "clear canonical URL for each."
                ),
                expected_signal="A higher ratio of unique pages.",
                how_to_verify="Re-scan: the unique-content ratio rises.",
            )
        )
    if other_ratio > 0.5:
        families.append(
            _make(
                rule_id="RDY-014",
                family="page_classification",
                category="technical",
                component_score=tech_score,
                confidence=confidence,
                impact=0.5,
                effort=2,
                title="Clarify each page's topic and type",
                problem="Many pages could not be classified into a clear type or topic.",
                evidence=[f"unclassified_page_ratio={round(other_ratio, 2)}"],
                recommendation=(
                    "Give each page one clear topic, a descriptive title and H1, and "
                    "matching structured data so its type is unambiguous."
                ),
                expected_signal="Fewer unclassified pages.",
                how_to_verify="Re-scan: the unclassified-page ratio drops.",
            )
        )

    # INVARIANT: an APPLICABLE Offer Clarity shown below "Good" (< 65 — i.e. "Weak"
    # or "Needs improvement", the bands the report lists under "What needs
    # improvement") must always carry an action, so a component shown as needing
    # improvement never appears with an empty fix list.
    #
    # RDY-002 (V1) only covers the case where services ARE detected but lack
    # dedicated pages. It leaves two gaps this catch-all fills:
    #   1. no offering detected at all (offer often near 0);
    #   2. an offering is present in prose but under-specified, so offer lands in
    #      the 50-64 "Needs improvement" band with no RDY-002 firing.
    # On non-commercial (content/data) sites Offer Clarity is N/A, not weak, so no
    # offer action is emitted — the Dataset/Article advice in RDY-005 covers them.
    offer_score = next((c.score for c in readiness.components if c.name == "offer_clarity"), 0.0)
    has_dedicated_action = any(a.rule_id == "RDY-002" for _, a in families)
    if not non_commercial and offer_score < 65 and not has_dedicated_action:
        has_offering = bool(profile.services or profile.products)
        if has_offering:
            title = "Make your offering explicit and machine-readable"
            problem = (
                "Your offering comes across mostly as prose. AI answer engines cannot cleanly "
                "identify the specific products, services or tools you provide, so Offer Clarity "
                "stays low even though the site clearly does something."
            )
            recommendation = (
                "Give each core product, service or tool its own clearly named page or section "
                "with concrete detail, and back it with matching structured data: Service or "
                "Product for what you sell, or SoftwareApplication for an online tool."
            )
        else:
            title = "State what you offer clearly"
            problem = (
                "AI answer engines could not identify what you offer. If your products, services "
                "or tools are only described in prose, they are not clearly machine-readable."
            )
            recommendation = (
                "State your main products, services or tools plainly on a dedicated page or "
                "section, and add matching structured data: Service or Product for what you sell, "
                "or SoftwareApplication for an online tool."
            )
        families.append(
            _make(
                rule_id="RDY-002B",
                family="RDY-002",  # one offer action at most; mutually exclusive with RDY-002
                category="offer",
                component_score=offer_score,
                confidence=confidence,
                impact=0.85,
                effort=3,
                title=title,
                problem=problem,
                evidence=[
                    f"offer_clarity={offer_score}",
                    f"services={len(profile.services)}",
                    f"products={len(profile.products)}",
                ],
                recommendation=recommendation,
                expected_signal="Offer Clarity rises once a clear, structured offering is detected.",
                how_to_verify="Re-scan: your offering (service, product or software) is detected.",
            )
        )

    # Dedup by family, keep highest priority; then sort.
    best: dict[str, Action] = {}
    for family, action in families:
        if family not in best or action.priority_score > best[family].priority_score:
            best[family] = action
    actions = sorted(best.values(), key=lambda a: (-a.priority_score, a.rule_id))
    return actions
