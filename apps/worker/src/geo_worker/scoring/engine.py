"""Readiness component formulas (§16–24).

Each component returns named sub-scores whose weights total 100; the component
score is Σ(weight × strength). The overall score is the fixed §16 blend of the
seven components. Signals are deterministic proxies over the extracted pages,
the business profile, the coverage report, and crawl metadata — documented so
the methodology stays explainable for the SOL_HIGH review.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from geo_worker.coverage.types import CoverageReport
from geo_worker.extraction.types import ExtractedPage
from geo_worker.profile.types import BusinessProfile

from .confidence import compute_confidence
from .types import COMPONENT_WEIGHTS, ComponentScore, CrawlMeta, ReadinessResult, SubScore

_ORG_MARKERS = ("organization", "localbusiness", "business", "corporation", "store")
_DATE_KEYS = ("datePublished", "dateModified", "dateCreated")
_DEDICATED = {"service", "product"}


def _tokens(text: str) -> set[str]:
    return {t for t in re.split(r"[^a-z0-9]+", text.lower()) if t}


def _jaccard(a: set[str], b: set[str]) -> float:
    return len(a & b) / len(a | b) if a and b else 0.0


def _type_list(node: dict) -> list[str]:
    t = node.get("@type")
    if isinstance(t, str):
        return [t]
    if isinstance(t, list):
        return [x for x in t if isinstance(x, str)]
    return []


@dataclass
class _ScoreIndex:
    n: int
    page_types: list[str]
    brand_resolved: bool
    brand_present: bool
    legal_name_present: bool
    brand_domain_sim: float
    brand_title_pages: int
    services_count: int
    products_count: int
    aliases: int
    needs_confirmation: bool
    countries: int
    locations: int
    audiences: int
    dedicated_pages: int
    org_name_present: bool
    org_core_fields: int
    org_distinct_names: int
    has_service_product_jsonld: bool
    has_breadcrumb_jsonld: bool
    has_dates_jsonld: bool
    canonical_ratio: float
    jsonld_ratio: float
    internal_links_ratio: float
    unique_hash_ratio: float
    digits_ratio: float
    longtext200_ratio: float
    headings_structure_ratio: float
    dedicated_longtext400: bool
    dedicated_longtext200: bool

    def has(self, page_type: str) -> bool:
        return page_type in self.page_types

    @property
    def has_case(self) -> bool:
        return self.has("case_study") or self.has("reference")

    @property
    def has_guide(self) -> bool:
        return self.has("guide") or self.has("reference")

    @classmethod
    def build(cls, pages: list[ExtractedPage], profile: BusinessProfile) -> _ScoreIndex:
        n = len(pages)
        types = [p.page_type for p in pages]
        brand = profile.brand_name
        brand_tokens = _tokens(brand) if brand else set()
        domain_tokens = _tokens(profile.canonical_domain.rsplit(".", 1)[0])

        org_names: set[str] = set()
        org_core = 0
        has_sp = False
        has_bc = False
        has_dates = False
        for p in pages:
            for node in p.json_ld:
                types_l = [t.lower() for t in _type_list(node)]
                if any(m in t for t in types_l for m in _ORG_MARKERS):
                    name = node.get("name")
                    if isinstance(name, str) and name.strip():
                        org_names.add(name.strip().lower())
                    present = sum(1 for k in ("name", "url", "address") if node.get(k)) + (
                        1
                        if (node.get("telephone") or node.get("email") or node.get("contactPoint"))
                        else 0
                    )
                    org_core = max(org_core, present)
                if any("service" in t or "product" in t for t in types_l):
                    has_sp = True
                if any("breadcrumb" in t for t in types_l):
                    has_bc = True
                if any(k in node for k in _DATE_KEYS):
                    has_dates = True

        def ratio(pred) -> float:
            return sum(1 for p in pages if pred(p)) / n if n else 0.0

        brand_title_pages = 0
        if brand:
            bl = brand.lower()
            brand_title_pages = sum(
                1 for p in pages if bl in (p.title or "").lower() or bl in (p.h1 or "").lower()
            )

        return cls(
            n=n,
            page_types=types,
            brand_resolved=bool(brand) and not profile.needs_confirmation,
            brand_present=bool(brand),
            legal_name_present=bool(profile.legal_name),
            brand_domain_sim=_jaccard(brand_tokens, domain_tokens),
            brand_title_pages=brand_title_pages,
            services_count=len(profile.services),
            products_count=len(profile.products),
            aliases=len(profile.aliases),
            needs_confirmation=profile.needs_confirmation,
            countries=len(profile.countries),
            locations=len(profile.locations),
            audiences=len(profile.target_audiences),
            dedicated_pages=sum(1 for t in types if t in _DEDICATED),
            org_name_present=bool(org_names),
            org_core_fields=org_core,
            org_distinct_names=len(org_names),
            has_service_product_jsonld=has_sp,
            has_breadcrumb_jsonld=has_bc,
            has_dates_jsonld=has_dates,
            canonical_ratio=ratio(lambda p: bool(p.canonical_url)),
            jsonld_ratio=ratio(lambda p: bool(p.json_ld)),
            internal_links_ratio=ratio(lambda p: bool(p.internal_links)),
            unique_hash_ratio=(len({p.content_hash for p in pages}) / n) if n else 0.0,
            digits_ratio=ratio(lambda p: any(c.isdigit() for c in p.visible_text)),
            longtext200_ratio=ratio(lambda p: len(p.visible_text) >= 200),
            headings_structure_ratio=ratio(lambda p: sum(len(v) for v in p.headings.values()) >= 3),
            dedicated_longtext400=any(
                p.page_type in _DEDICATED and len(p.visible_text) >= 400 for p in pages
            ),
            dedicated_longtext200=any(
                p.page_type in _DEDICATED and len(p.visible_text) >= 200 for p in pages
            ),
        )


def _component(name: str, entries: list[tuple[str, int, float]]) -> ComponentScore:
    subs = [
        SubScore(name=n, weight=w, strength=round(s, 4), points=round(w * s, 4))
        for n, w, s in entries
    ]
    return ComponentScore(name=name, score=round(sum(s.points for s in subs), 2), subscores=subs)


def _entity(idx: _ScoreIndex) -> list[tuple[str, int, float]]:
    return [
        (
            "canonical_brand_identity",
            20,
            1.0 if idx.brand_resolved else (0.5 if idx.brand_present else 0.0),
        ),
        ("legal_brand_relation", 10, 1.0 if idx.legal_name_present else 0.0),
        ("domain_brand_consistency", 15, idx.brand_domain_sim if idx.brand_present else 0.0),
        (
            "about_contact_imprint_identity",
            15,
            (0.5 if idx.has("about") else 0.0)
            + (0.5 if (idx.has("contact") or idx.has("legal")) else 0.0),
        ),
        (
            "location_country_clarity",
            10,
            (0.5 if idx.countries else 0.0) + (0.5 if idx.locations else 0.0),
        ),
        (
            "alias_consistency",
            10,
            0.3 if idx.needs_confirmation else max(0.5, 1.0 - 0.2 * idx.aliases),
        ),
        ("organization_structured_data", 15, 1.0 if idx.org_name_present else 0.0),
        (
            "cross_page_identity_consistency",
            5,
            1.0 if idx.brand_title_pages >= 2 else (0.5 if idx.brand_title_pages == 1 else 0.0),
        ),
    ]


def _offer(idx: _ScoreIndex) -> list[tuple[str, int, float]]:
    return [
        ("primary_services_explicit", 20, min(idx.services_count, 3) / 3),
        ("dedicated_service_product_pages", 20, min(idx.dedicated_pages, 3) / 3),
        ("product_service_taxonomy", 15, min(idx.services_count + idx.products_count, 4) / 4),
        (
            "business_offering_relation",
            15,
            1.0
            if (idx.services_count and idx.brand_resolved)
            else (0.6 if idx.services_count else 0.0),
        ),
        ("target_customer_use_case", 10, 1.0 if idx.audiences else 0.0),
        ("location_service_relation", 10, 1.0 if (idx.locations and idx.services_count) else 0.0),
        (
            "differentiating_factual_detail",
            10,
            1.0 if idx.dedicated_longtext400 else (0.5 if idx.dedicated_longtext200 else 0.0),
        ),
    ]


def _sourceability(idx: _ScoreIndex) -> list[tuple[str, int, float]]:
    return [
        ("specific_factual_statements", 15, idx.digits_ratio),
        ("original_first_party", 15, idx.longtext200_ratio),
        ("tables_lists_spec_structure", 10, idx.headings_structure_ratio),
        (
            "stable_page_topic_identity",
            10,
            (sum(1 for t in idx.page_types if t != "other") / idx.n) if idx.n else 0.0,
        ),
        ("org_author_attribution", 10, 1.0 if idx.org_name_present else 0.0),
        ("dates_freshness", 5, 1.0 if idx.has_dates_jsonld else 0.0),
        ("named_methodology_source", 10, 1.0 if idx.has_guide else 0.0),
        ("case_studies_examples", 10, 1.0 if idx.has_case else 0.0),
        ("clear_answers_faq", 10, 1.0 if idx.has("faq") else 0.0),
        ("low_ambiguity_marketing", 5, 1.0 if idx.brand_resolved else 0.5),
    ]


def _structured(idx: _ScoreIndex) -> list[tuple[str, int, float]]:
    return [
        ("valid_org_identity", 25, 1.0 if idx.org_name_present else 0.0),
        ("core_fields_completeness", 15, idx.org_core_fields / 4),
        ("product_service_linkage", 20, 1.0 if idx.has_service_product_jsonld else 0.0),
        ("page_appropriate_structured_data", 15, idx.jsonld_ratio),
        ("canonical_metadata", 10, idx.canonical_ratio),
        (
            "breadcrumbs_internal_relations",
            5,
            1.0 if idx.has_breadcrumb_jsonld else (0.5 if idx.internal_links_ratio > 0 else 0.0),
        ),
        ("no_contradictory_markup", 10, 0.5 if idx.org_distinct_names > 1 else 1.0),
    ]


def _trust(idx: _ScoreIndex) -> list[tuple[str, int, float]]:
    return [
        ("about_transparency", 15, 1.0 if idx.has("about") else 0.0),
        (
            "contact_legal_identity",
            15,
            (0.5 if idx.has("contact") else 0.0) + (0.5 if idx.has("legal") else 0.0),
        ),
        ("case_studies_references", 15, 1.0 if idx.has_case else 0.0),
        ("named_customers", 10, 0.5 if idx.has_case else 0.0),
        (
            "authors_responsibility",
            10,
            1.0 if idx.org_name_present else (0.5 if idx.has("legal") else 0.0),
        ),
        ("published_updated_dates", 10, 1.0 if idx.has_dates_jsonld else 0.0),
        ("claims_supported_specifics", 15, idx.digits_ratio),
        ("policies_terms_privacy", 5, 1.0 if idx.has("legal") else 0.0),
        (
            "consistent_contact_location",
            5,
            1.0 if (idx.locations and idx.countries <= 1) else (0.5 if idx.locations else 0.0),
        ),
    ]


def _technical(idx: _ScoreIndex, meta: CrawlMeta) -> list[tuple[str, int, float]]:
    if meta.pages_requested > 0:
        crawlable = min(meta.pages_crawled / meta.pages_requested, 1.0)
    else:
        crawlable = 1.0 if idx.n else 0.0
    return [
        ("homepage_reachable", 15, 1.0 if meta.homepage_reachable else 0.0),
        ("relevant_pages_crawlable", 20, crawlable),
        ("robots_not_blocking_core", 10, 0.0 if meta.robots_blocked_core else 1.0),
        ("canonical_consistency", 10, idx.canonical_ratio),
        ("server_visible_meaningful_content", 20, idx.longtext200_ratio),
        ("low_duplicate_content", 10, idx.unique_hash_ratio),
        ("stable_internal_links", 10, idx.internal_links_ratio),
        ("valid_response_content_types", 5, meta.valid_response_ratio),
    ]


def compute_readiness(
    pages: list[ExtractedPage],
    profile: BusinessProfile,
    coverage: CoverageReport,
    crawl_meta: CrawlMeta,
    methodology_version: str,
) -> ReadinessResult:
    """Compute the full readiness snapshot (§16–24). Confidence is separate."""
    idx = _ScoreIndex.build(pages, profile)

    entity = _component("entity_clarity", _entity(idx))
    offer = _component("offer_clarity", _offer(idx))
    coverage_score = round(coverage.prompt_coverage_score, 2)
    coverage_component = ComponentScore(
        name="prompt_coverage",
        score=coverage_score,
        subscores=[
            SubScore(
                name="prompt_coverage_aggregate",
                weight=100,
                strength=round(coverage_score / 100, 4),
                points=coverage_score,
            )
        ],
    )
    source = _component("sourceability", _sourceability(idx))
    structured = _component("structured_data", _structured(idx))
    trust = _component("evidence_trust", _trust(idx))
    technical = _component("technical_access", _technical(idx, crawl_meta))

    components = [entity, offer, coverage_component, source, structured, trust, technical]
    by_name = {
        "entity_clarity": entity.score,
        "offer_clarity": offer.score,
        "prompt_coverage": coverage_component.score,
        "sourceability": source.score,
        "structured_data": structured.score,
        "evidence_trust": trust.score,
        "technical_access": technical.score,
    }
    overall = round(sum(COMPONENT_WEIGHTS[k] * v for k, v in by_name.items()), 2)

    confidence_score, confidence_components = compute_confidence(
        pages, profile, coverage, crawl_meta
    )

    return ReadinessResult(
        methodology_version=methodology_version,
        overall_score=overall,
        entity_clarity_score=entity.score,
        offer_clarity_score=offer.score,
        prompt_coverage_score=coverage_component.score,
        sourceability_score=source.score,
        structured_data_score=structured.score,
        evidence_trust_score=trust.score,
        technical_access_score=technical.score,
        confidence_score=confidence_score,
        components=components,
        confidence_components=confidence_components,
    )


def recompute_overall(components: list[ComponentScore]) -> float:
    """Independently recompute the overall from component scores (validator)."""
    by_name = {c.name: c.score for c in components}
    return round(sum(COMPONENT_WEIGHTS[k] * by_name[k] for k in COMPONENT_WEIGHTS), 2)
