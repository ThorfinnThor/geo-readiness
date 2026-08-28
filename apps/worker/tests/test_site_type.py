"""Site-type classification (§v2-plan 6)."""

from __future__ import annotations

from geo_worker.extraction.types import ExtractedPage
from geo_worker.profile.site_type import classify_site_type
from geo_worker.profile.types import BusinessProfile


def _p(url: str, ptype: str = "other", text: str = "", json_ld=None) -> ExtractedPage:
    return ExtractedPage(final_url=url, page_type=ptype, visible_text=text, json_ld=json_ld or [])


def _prof(**kw) -> BusinessProfile:
    return BusinessProfile(canonical_domain="ex.example", **kw)


def test_ecommerce_from_product_schema_and_cart() -> None:
    pages = [
        _p("https://s/", "product", "Add to cart now", [{"@type": "Product"}]),
        _p("https://s/p1", "product", "Add to cart", [{"@type": "Product"}]),
    ]
    assert classify_site_type(pages, _prof(products=["Widget"]))[0] == "ecommerce"


def test_local_business_from_schema() -> None:
    pages = [_p("https://s/", "home", "We are open", [{"@type": "LocalBusiness"}])]
    assert classify_site_type(pages, _prof())[0] == "local_business"


def test_saas_from_pricing_and_trial_cues() -> None:
    pages = [
        _p("https://s/", "home", "Start your free trial today"),
        _p("https://s/pricing", "pricing", "Sign up free, no credit card"),
    ]
    assert classify_site_type(pages, _prof(services=["Audit"]))[0] == "saas"


def test_publisher_from_article_pages() -> None:
    pages = [_p(f"https://s/a{i}", "blog", "article body") for i in range(4)]
    assert classify_site_type(pages, _prof())[0] == "publisher_editorial"


def test_service_business_without_location() -> None:
    pages = [_p("https://s/", "home"), _p("https://s/services", "service", "we do plumbing")]
    assert classify_site_type(pages, _prof(services=["Plumbing"]))[0] == "service_business"


def test_service_with_location_is_local() -> None:
    pages = [_p("https://s/", "home"), _p("https://s/services", "service")]
    got = classify_site_type(pages, _prof(services=["Plumbing"], locations=["Berlin"]))[0]
    assert got == "local_business"


def test_bare_site_is_unknown() -> None:
    pages = [_p("https://s/", "home", "hello")]
    assert classify_site_type(pages, _prof())[0] == "unknown"


def test_product_catalog_without_cart_is_not_ecommerce() -> None:
    # Regression (selectyoursauna.com): a comparison/catalog site with product
    # schema and product pages but NO cart/checkout must NOT be classified as
    # ecommerce (which would apply the wrong offer expectations).
    pages = [
        _p("https://s/", "product", "Sauna im Vergleich", [{"@type": "Product"}]),
        _p("https://s/p1", "product", "Technische Daten", [{"@type": "Product"}]),
    ]
    assert classify_site_type(pages, _prof(products=["Sauna A", "Sauna B"]))[0] != "ecommerce"


def test_german_shop_with_warenkorb_is_ecommerce() -> None:
    # A real German shop is recognised via German cart wording, so removing the
    # cartless fallback does not lose genuine shops.
    pages = [
        _p("https://s/", "product", "In den Warenkorb legen", [{"@type": "Product"}]),
        _p("https://s/p1", "product", "Zur Kasse", [{"@type": "Product"}]),
    ]
    assert classify_site_type(pages, _prof(products=["Widget"]))[0] == "ecommerce"
