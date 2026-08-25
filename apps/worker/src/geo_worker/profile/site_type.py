"""Site-type classification (§v2-plan 6).

A deterministic primary archetype so applicability rules stop treating every site
like a local service business. First match wins; every branch is evidence-backed
by a page signal (schema, page types, offering, or a small keyword affordance).
The result drives per-profile rule applicability (e.g. location only applies to
location-based businesses).
"""

from __future__ import annotations

from geo_worker.extraction.types import ExtractedPage
from geo_worker.profile.types import BusinessProfile

_ECOM_KW = (
    "add to cart",
    "add to basket",
    "add to bag",
    "shopping cart",
    "proceed to checkout",
)
_SAAS_KW = (
    "free trial",
    "start free",
    "sign up free",
    "get started free",
    "no credit card",
    "start your free",
    "integrations",
    "api key",
)
_LOCAL_KW = (
    "opening hours",
    "business hours",
    "get directions",
    "our address",
    "visit us",
    "find us",
)


def _jsonld_types(pages: list[ExtractedPage]) -> set[str]:
    out: set[str] = set()
    for p in pages:
        for node in p.json_ld:
            t = node.get("@type")
            if isinstance(t, str):
                out.add(t.lower())
            elif isinstance(t, list):
                out.update(x.lower() for x in t if isinstance(x, str))
    return out


def classify_site_type(pages: list[ExtractedPage], profile: BusinessProfile) -> tuple[str, float]:
    """Return (site_type, confidence 0..1)."""
    n = len(pages) or 1
    types = [p.page_type for p in pages]
    jl = _jsonld_types(pages)
    text = " ".join(p.visible_text.lower() for p in pages)

    def frac(pred) -> float:
        return sum(1 for p in pages if pred(p)) / n

    product_pages = types.count("product")

    # E-commerce: product schema/pages plus a real cart/checkout affordance.
    if ("product" in jl or product_pages >= 2 or profile.products) and any(
        k in text for k in _ECOM_KW
    ):
        return "ecommerce", 0.8
    if "product" in jl and product_pages >= 2:
        return "ecommerce", 0.6

    # Local business: LocalBusiness schema, or a resolved location with local cues.
    if "localbusiness" in jl or any(t.endswith("business") for t in jl):
        return "local_business", 0.8
    if profile.locations and any(k in text for k in _LOCAL_KW):
        return "local_business", 0.7

    # SaaS: software schema, or a pricing page + trial/subscription cues + no location.
    if "softwareapplication" in jl or "webapplication" in jl:
        return "saas", 0.75
    if "pricing" in types and any(k in text for k in _SAAS_KW) and not profile.locations:
        return "saas", 0.65

    # Publisher / editorial: mostly article-like pages, with authors.
    editorial = frac(lambda p: p.page_type in ("blog", "guide", "case_study", "reference"))
    authored = sum(
        1 for p in pages if p.signals.author_names or p.signals.organization_author_present
    )
    if editorial >= 0.5 and n >= 3:
        return "publisher_editorial", 0.65
    if editorial >= 0.4 and authored >= 2:
        return "publisher_editorial", 0.55

    # Documentation / reference.
    if frac(lambda p: p.page_type == "reference") >= 0.4 and n >= 3:
        return "documentation_reference", 0.6

    # Service business (a resolved location makes it local).
    if profile.services:
        return ("local_business", 0.6) if profile.locations else ("service_business", 0.6)

    # Portfolio / personal brand: a resolved brand but very few pages.
    if profile.brand_name and n <= 3:
        return "portfolio_personal_brand", 0.4

    return "unknown", 0.2
