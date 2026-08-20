"""Coverage computation (§15).

Evidence strength grades (§15):
    1.0 dedicated / structured / confirmed
    0.8 strong explicit body evidence
    0.6 repeated site-wide evidence
    0.4 weak single mention
    0.0 missing
"""

from __future__ import annotations

import json
from dataclasses import dataclass

from geo_worker.clusters.types import GeneratedCluster
from geo_worker.extraction.types import ExtractedPage
from geo_worker.profile.types import BusinessProfile

from .types import ClusterCoverageResult, CoverageReport, RequirementResult

_DEDICATED_TYPES = {"service", "product", "pricing", "location", "about"}
_PRICING_TOKENS = ("€", " eur", "preis", "kosten", "pricing", "price", "tarif")
_TRUST_TYPES = {"case_study", "reference"}

# Per-intent requirement matrix (name, weight, signal kind). Weights sum to 100.
_REQUIREMENTS: dict[str, list[tuple[str, int, str]]] = {
    "local": [
        ("service_presence", 30, "mention_service"),
        ("location_presence", 25, "mention_location"),
        ("service_location_link", 25, "colocation_sl"),
        ("company_identity", 10, "identity"),
        ("evidence_depth", 10, "depth_service"),
    ],
    "recommendation": [
        ("service_presence", 40, "mention_service"),
        ("company_identity", 20, "identity"),
        ("evidence_depth", 40, "depth_service"),
    ],
    "category_discovery": [
        ("service_presence", 45, "mention_service"),
        ("evidence_depth", 35, "depth_service"),
        ("company_identity", 20, "identity"),
    ],
    "best_of": [
        ("service_presence", 40, "mention_service"),
        ("evidence_depth", 35, "depth_service"),
        ("company_identity", 25, "identity"),
    ],
    "comparison": [
        ("product_presence", 45, "mention_product"),
        ("evidence_depth", 35, "depth_product"),
        ("company_identity", 20, "identity"),
    ],
    "alternative": [
        ("product_presence", 50, "mention_product"),
        ("evidence_depth", 30, "depth_product"),
        ("company_identity", 20, "identity"),
    ],
    "pricing": [
        ("pricing_presence", 50, "pricing"),
        ("product_presence", 30, "mention_product"),
        ("company_identity", 20, "identity"),
    ],
    "product_fit": [
        ("service_presence", 40, "mention_service"),
        ("audience_presence", 30, "mention_audience"),
        ("evidence_depth", 30, "depth_service"),
    ],
    "trust": [
        ("company_identity", 40, "identity"),
        ("trust_signals", 40, "trust"),
        ("evidence_depth", 20, "depth_service"),
    ],
    "combined_service": [
        ("services_link", 50, "colocation_services"),
        ("service_a_presence", 25, "mention_service"),
        ("service_b_presence", 25, "mention_product"),
    ],
    "branded": [
        ("company_identity", 50, "identity"),
        ("brand_presence", 50, "mention_brand"),
    ],
    "integration": [
        ("service_presence", 50, "mention_service"),
        ("evidence_depth", 30, "depth_service"),
        ("company_identity", 20, "identity"),
    ],
}


@dataclass
class _SiteIndex:
    pages: list[ExtractedPage]
    texts: list[str]  # per-page lowercased title+headings+body
    jsonld: list[str]  # per-page lowercased serialized JSON-LD
    brand_known: bool
    has_identity_page: bool
    has_pricing_page: bool
    trust_pages: int
    has_legal: bool

    @classmethod
    def build(cls, pages: list[ExtractedPage], profile: BusinessProfile) -> _SiteIndex:
        texts: list[str] = []
        jsonld: list[str] = []
        for p in pages:
            heading_text = " ".join(h for group in p.headings.values() for h in group)
            texts.append(
                " ".join([p.title or "", p.h1 or "", heading_text, p.visible_text]).lower()
            )
            jsonld.append(json.dumps(p.json_ld, ensure_ascii=False).lower())
        types = [p.page_type for p in pages]
        return cls(
            pages=pages,
            texts=texts,
            jsonld=jsonld,
            brand_known=bool(profile.brand_name),
            has_identity_page=any(t in {"about", "legal", "contact"} for t in types),
            has_pricing_page="pricing" in types,
            trust_pages=sum(1 for t in types if t in _TRUST_TYPES),
            has_legal="legal" in types,
        )

    # --- signals -------------------------------------------------------

    def mention(self, term: str | None) -> float:
        t = (term or "").strip().lower()
        if not t:
            return 0.0
        pages_with = [i for i, txt in enumerate(self.texts) if t in txt]
        dedicated = any(
            self.pages[i].page_type in _DEDICATED_TYPES
            and (t in (self.pages[i].h1 or "").lower() or t in (self.pages[i].title or "").lower())
            for i in pages_with
        )
        if dedicated:
            return 1.0
        if any(t in jl for jl in self.jsonld):
            return 0.8
        if len(pages_with) >= 2:
            return 0.6
        if len(pages_with) == 1:
            return 0.4
        return 0.0

    def depth(self, term: str | None) -> float:
        t = (term or "").strip().lower()
        if not t:
            return 0.0
        for i, txt in enumerate(self.texts):
            if (
                self.pages[i].page_type in _DEDICATED_TYPES
                and t in txt
                and len(self.pages[i].visible_text) >= 200
            ):
                return 1.0
        return min(self.mention(t), 0.7)

    def colocation(self, a: str | None, b: str | None) -> float:
        ta, tb = (a or "").strip().lower(), (b or "").strip().lower()
        if not ta or not tb:
            return 0.0
        if any(ta in txt and tb in txt for txt in self.texts):
            return 1.0
        if self.mention(ta) > 0 and self.mention(tb) > 0:
            return 0.5
        return 0.0

    def identity(self) -> float:
        if self.brand_known and self.has_identity_page:
            return 1.0
        if self.brand_known:
            return 0.6
        if self.has_identity_page:
            return 0.4
        return 0.0

    def pricing(self) -> float:
        if self.has_pricing_page:
            return 1.0
        if any(any(tok in txt for tok in _PRICING_TOKENS) for txt in self.texts):
            return 0.6
        return 0.0

    def trust(self) -> float:
        if self.trust_pages and self.has_legal:
            return 1.0
        if self.trust_pages or self.has_legal:
            return 0.6
        return 0.0

    def supporting_urls(self, terms: list[str]) -> list[str]:
        wanted = [t.strip().lower() for t in terms if t and t.strip()]
        urls = {
            self.pages[i].final_url
            for i, txt in enumerate(self.texts)
            if any(w in txt for w in wanted)
        }
        return sorted(urls)


def _signal(kind: str, index: _SiteIndex, cluster: GeneratedCluster) -> float:
    match kind:
        case "mention_service":
            return index.mention(cluster.service)
        case "mention_location":
            return index.mention(cluster.location)
        case "mention_product":
            return index.mention(cluster.product)
        case "mention_audience":
            return index.mention(cluster.audience)
        case "mention_brand":
            return index.mention(cluster.topic)
        case "depth_service":
            return index.depth(cluster.service)
        case "depth_product":
            return index.depth(cluster.product)
        case "colocation_sl":
            return index.colocation(cluster.service, cluster.location)
        case "colocation_services":
            return index.colocation(cluster.service, cluster.product)
        case "identity":
            return index.identity()
        case "pricing":
            return index.pricing()
        case "trust":
            return index.trust()
    return 0.0


def _score_cluster(index: _SiteIndex, cluster: GeneratedCluster) -> ClusterCoverageResult:
    reqs = _REQUIREMENTS.get(cluster.intent, [])
    results: list[RequirementResult] = []
    score = 0.0
    weight_with_evidence = 0
    total_weight = 0
    for name, weight, kind in reqs:
        strength = _signal(kind, index, cluster)
        score += weight * strength
        total_weight += weight
        if strength > 0:
            weight_with_evidence += weight
        results.append(RequirementResult(name=name, weight=weight, strength=round(strength, 4)))

    terms = [cluster.service, cluster.product, cluster.location, cluster.audience, cluster.topic]
    return ClusterCoverageResult(
        cluster_key=cluster.cluster_key,
        coverage_score=round(score, 2),
        confidence=round(weight_with_evidence / total_weight, 4) if total_weight else 0.0,
        requirements=results,
        matched_requirements=[r.name for r in results if r.strength >= 0.6],
        missing_requirements=[r.name for r in results if r.strength == 0.0],
        supporting_urls=index.supporting_urls([t for t in terms if t]),
    )


def score_requirements(
    clusters: list[GeneratedCluster],
    pages: list[ExtractedPage],
    profile: BusinessProfile,
) -> list[ClusterCoverageResult]:
    """Per-cluster requirement scoring (coverage_score == requirements score).

    Public so the V2 methodology can reuse it and blend in topical alignment.
    """
    index = _SiteIndex.build(pages, profile)
    return [_score_cluster(index, c) for c in clusters]


def aggregate_prompt_coverage(
    results: list[ClusterCoverageResult], clusters: list[GeneratedCluster]
) -> float:
    weight_sum = sum(c.weight for c in clusters)
    if weight_sum <= 0:
        return 0.0
    weighted = sum(r.coverage_score * c.weight for r, c in zip(results, clusters, strict=True))
    return round(weighted / weight_sum, 2)


def compute_coverage(
    clusters: list[GeneratedCluster],
    pages: list[ExtractedPage],
    profile: BusinessProfile,
) -> CoverageReport:
    """V1: coverage == requirements score, weight-averaged aggregate (§15)."""
    results = score_requirements(clusters, pages, profile)
    return CoverageReport(
        prompt_coverage_score=aggregate_prompt_coverage(results, clusters), clusters=results
    )
