"""Deterministic business-profile tests (E06)."""

from __future__ import annotations

from pathlib import Path

from geo_worker.extraction import extract_page
from geo_worker.extraction.types import ExtractedPage, Link
from geo_worker.profile import build_profile

FIXTURES = Path(__file__).parent / "fixtures" / "html"


def _evidence_fields(profile) -> set[str]:
    return {e.field_name for e in profile.evidence}


def test_confident_brand_with_corroborating_signals() -> None:
    home = ExtractedPage(
        final_url="https://flowmetrics.example/",
        title="FlowMetrics — Analytics for Teams",
        h1="FlowMetrics",
        page_type="home",
        language="en",
        open_graph={"og:site_name": "FlowMetrics"},
        json_ld=[
            {
                "@type": "Organization",
                "name": "FlowMetrics",
                "legalName": "FlowMetrics Inc.",
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "Berlin",
                    "addressCountry": "DE",
                },
            }
        ],
    )
    about = ExtractedPage(
        final_url="https://flowmetrics.example/about",
        title="About FlowMetrics",
        h1="About FlowMetrics",
        page_type="about",
    )

    profile = build_profile([home, about], "flowmetrics.example")

    assert profile.brand_name == "FlowMetrics"
    assert profile.needs_confirmation is False
    assert profile.brand_confidence >= 0.8
    assert profile.legal_name == "FlowMetrics Inc."
    assert profile.countries == ["DE"]
    assert profile.locations == ["Berlin"]
    assert profile.languages == ["en"]
    assert "brand_name" in _evidence_fields(profile)


def test_ambiguous_names_resolve_to_unknown() -> None:
    home = ExtractedPage(
        final_url="https://portal.example/",
        title="Welcome",
        h1="Welcome",
        page_type="home",
        json_ld=[
            {"@type": "Organization", "name": "Alpha Systems"},
            {"@type": "Organization", "name": "Beta Holdings"},
        ],
    )
    profile = build_profile([home], "portal.example")
    assert profile.brand_name is None
    assert profile.needs_confirmation is True


def test_confirmed_name_overrides() -> None:
    home = ExtractedPage(final_url="https://portal.example/", page_type="home")
    profile = build_profile([home], "portal.example", confirmed_name="Alpha Systems")
    assert profile.brand_name == "Alpha Systems"
    assert profile.brand_confidence == 1.0
    assert profile.needs_confirmation is False


def test_services_and_products_with_evidence() -> None:
    page = ExtractedPage(
        final_url="https://x.example/",
        title="X",
        page_type="home",
        json_ld=[{"@type": "Service", "name": "SEO Audit"}],
        internal_links=[
            Link(href="https://x.example/leistungen/beratung", text="Beratung"),
            Link(href="https://x.example/produkte/widget", text="Widget"),
        ],
    )
    profile = build_profile([page], "x.example")

    assert profile.services == ["beratung", "seo audit"]
    assert profile.products == ["widget"]
    fields = _evidence_fields(profile)
    assert "service" in fields
    assert "product" in fields


def test_profile_is_deterministic() -> None:
    pages = [
        ExtractedPage(
            final_url="https://flowmetrics.example/",
            title="FlowMetrics — Analytics",
            h1="FlowMetrics",
            page_type="home",
            open_graph={"og:site_name": "FlowMetrics"},
            json_ld=[{"@type": "Organization", "name": "FlowMetrics"}],
        )
    ]
    a = build_profile(pages, "flowmetrics.example")
    b = build_profile(pages, "flowmetrics.example")
    assert a.profile_hash == b.profile_hash
    assert a.brand_name == b.brand_name


def test_local_business_fixture_evidence() -> None:
    html = (FIXTURES / "local_business.html").read_text(encoding="utf-8")
    page = extract_page(html, "https://mueller-solar.example/")
    profile = build_profile([page], "mueller-solar.example")

    assert profile.languages == ["de", "en"]
    assert profile.countries == ["DE"]
    assert profile.locations == ["Ulm"]
    fields = _evidence_fields(profile)
    assert {"language", "country", "location"} <= fields
    # A lone homepage JSON-LD name without corroboration stays conservative.
    assert profile.needs_confirmation is True


def test_brand_from_multiword_concatenated_domain() -> None:
    # Regression (selectyoursauna.com): brand is "Brand — Tagline" (brand first),
    # there is no og:site_name/Organization JSON-LD, and the domain concatenates
    # the multi-word brand. Token overlap alone saw sim=0 and returned "unknown";
    # the spaceless domain match now resolves it.
    home = ExtractedPage(
        final_url="https://selectyoursauna.com/",
        title="Select Your Sauna — die passende Sauna für dein Zuhause",
        page_type="home",
        language="de",
    )
    profile = build_profile([home], "selectyoursauna.com")
    assert profile.brand_name == "Select Your Sauna"
    assert profile.needs_confirmation is False


def test_offering_extraction_rejects_ui_fragments() -> None:
    # Nav labels, link teasers with glyphs, and sentence fragments are not products.
    page = ExtractedPage(
        final_url="https://x.example/produkte",
        page_type="product",
        h1="Harvia Domo Large",
        json_ld=[
            {"@type": "Product", "name": "Karibu Sauna Antonia"},
            {"@type": "Product", "name": "Datensatz ansehen↗"},
            {"@type": "Product", "name": "Produkte"},
            {"@type": "Product", "name": "Sauna-Produkteim Vergleich."},
        ],
    )
    profile = build_profile([page], "x.example")
    assert "karibu sauna antonia" in profile.products
    assert "harvia domo large" in profile.products
    for junk in ("datensatz ansehen↗", "produkte", "sauna-produkteim vergleich."):
        assert junk not in profile.products


def test_legal_name_and_city_from_german_imprint_text() -> None:
    # No address/legalName JSON-LD, only a § 5 DDG imprint in prose (as on
    # selectyoursauna.com): extract the operator name and the city.
    home = ExtractedPage(final_url="https://selectyoursauna.com/", page_type="home", language="de")
    imprint = ExtractedPage(
        final_url="https://selectyoursauna.com/de/rechtliches/",
        page_type="legal",
        language="de",
        visible_text=(
            "Impressum Betreiber dieser Website ist das Einzelunternehmen SeitenHafen361. "
            "Inhaber: Schayan Yousefian Freienwalder Str. 34 13359 Berlin"
        ),
    )
    profile = build_profile([home, imprint], "selectyoursauna.com")
    assert profile.legal_name == "SeitenHafen361"
    assert profile.locations == ["Berlin"]


def test_imprint_city_trims_trailing_country_and_nav_label() -> None:
    # A postal-code + city capture over flattened imprint text can pull in the
    # country line and the next nav heading ("13359 Berlin Germany Contact").
    # Only the city itself must survive, so cluster prompts read cleanly.
    home = ExtractedPage(final_url="https://findyouraiscore.com/", page_type="home", language="en")
    imprint = ExtractedPage(
        final_url="https://findyouraiscore.com/imprint",
        page_type="legal",
        language="en",
        visible_text=(
            "Imprint Provider: SeitenHafen361 Some Street 1 13359 Berlin Germany Contact "
            "info@findyouraiscore.com"
        ),
    )
    profile = build_profile([home, imprint], "findyouraiscore.com")
    assert profile.locations == ["Berlin"]


def test_topics_extracted_for_content_site_without_offerings() -> None:
    # A content/informational site (no services/products) yields content topics
    # from its content-page headings, excluding home/legal, for the citation kit.
    home = ExtractedPage(
        final_url="https://besttravelclimate.com/",
        page_type="home",
        language="de",
        h1="Best Travel Climate",
    )
    p1 = ExtractedPage(
        final_url="https://besttravelclimate.com/madeira",
        page_type="other",
        language="de",
        h1="Madeira im Oktober",
    )
    p2 = ExtractedPage(
        final_url="https://besttravelclimate.com/kreta",
        page_type="guide",
        language="de",
        h1="Beste Reisezeit für Kreta",
    )
    legal = ExtractedPage(
        final_url="https://besttravelclimate.com/impressum",
        page_type="legal",
        language="de",
        h1="Impressum",
    )
    profile = build_profile([home, p1, p2, legal], "besttravelclimate.com")
    assert profile.services == []
    assert profile.products == []
    assert "Madeira im Oktober" in profile.topics
    assert "Beste Reisezeit für Kreta" in profile.topics
    assert "Impressum" not in profile.topics  # legal page excluded
    assert "Best Travel Climate" not in profile.topics  # home page excluded


def test_topics_empty_when_offerings_exist() -> None:
    # Provider sites (with services) never get topic fallback, keeping golden safe.
    home = ExtractedPage(
        final_url="https://acme.example/", page_type="home", language="en", h1="Acme"
    )
    svc = ExtractedPage(
        final_url="https://acme.example/service",
        page_type="service",
        language="en",
        h1="Solar panels",
    )
    content = ExtractedPage(
        final_url="https://acme.example/blog/x", page_type="blog", language="en", h1="Some article"
    )
    profile = build_profile([home, svc, content], "acme.example")
    assert profile.services  # has an offering
    assert profile.topics == []  # so no topic fallback


def test_topics_use_titles_and_drop_near_duplicates() -> None:
    home = ExtractedPage(
        final_url="https://besttravelclimate.com/",
        page_type="home",
        language="de",
        h1="Best Travel Climate",
    )
    # h1 and title say the same thing -> collapses to one topic.
    a = ExtractedPage(
        final_url="https://besttravelclimate.com/madeira",
        page_type="other",
        language="de",
        h1="Madeira im Oktober",
        title="Madeira im Oktober | Best Travel Climate",
    )
    # Title-only page still contributes a topic.
    b = ExtractedPage(
        final_url="https://besttravelclimate.com/kreta",
        page_type="other",
        language="de",
        title="Beste Reisezeit für Kreta | Best Travel Climate",
    )
    # h1 and title differ -> both are kept.
    c = ExtractedPage(
        final_url="https://besttravelclimate.com/winter",
        page_type="other",
        language="de",
        h1="Warme Reiseziele im Winter",
        title="Klimadaten im Vergleich",
    )
    profile = build_profile([home, a, b, c], "besttravelclimate.com")
    topics = profile.topics
    assert "Madeira im Oktober" in topics
    assert sum(1 for x in topics if x.startswith("Madeira")) == 1  # near-duplicate collapsed
    assert "Beste Reisezeit für Kreta" in topics  # came from the title alone
    assert "Warme Reiseziele im Winter" in topics  # 'Winter' is German, not a foreign marker
    assert "Klimadaten im Vergleich" in topics  # the title added a distinct topic


def test_topics_reject_single_word_umbrella_subject() -> None:
    # A one-word heading is the site's overall subject, not one page's, so the
    # question it would produce is too broad for that page to be its source.
    home = ExtractedPage(
        final_url="https://besttravelclimate.com/",
        page_type="home",
        language="de",
        h1="Best Travel Climate",
    )
    broad = ExtractedPage(
        final_url="https://besttravelclimate.com/de/klima",
        page_type="other",
        language="de",
        h1="Klima",
    )
    specific = ExtractedPage(
        final_url="https://besttravelclimate.com/de/beste-reiseziele/januar",
        page_type="other",
        language="de",
        h1="Beste Reiseziele im Januar",
    )
    profile = build_profile([home, broad, specific], "besttravelclimate.com")
    assert "Klima" not in profile.topics
    assert "Beste Reiseziele im Januar" in profile.topics


def test_one_pager_falls_back_to_the_home_page_subject() -> None:
    # A one-pager's only other links are legal pages, so the home page IS the
    # content page. Its title names the subject; the h1 is a call to action and
    # must not win ("Requestbuyer access.").
    home = ExtractedPage(
        final_url="https://getatm.io/",
        page_type="home",
        language="en",
        title="ATM — Agent Trajectory Marketplace",
        h1="Requestbuyer access.",
    )
    terms = ExtractedPage(
        final_url="https://getatm.io/legal/account-terms",
        page_type="legal",
        language="en",
        h1="Terms",
    )
    privacy = ExtractedPage(
        final_url="https://getatm.io/legal/account-privacy",
        page_type="legal",
        language="en",
        h1="Privacy",
    )
    profile = build_profile([home, terms, privacy], "getatm.io")
    assert profile.topics == ["Agent Trajectory Marketplace"]


def test_home_page_is_not_used_when_content_pages_yield_topics() -> None:
    home = ExtractedPage(
        final_url="https://besttravelclimate.com/",
        page_type="home",
        language="de",
        title="Best Travel Climate · Wunschklima finden",
        h1="Finde dein Reiseziel",
    )
    content = ExtractedPage(
        final_url="https://besttravelclimate.com/de/beste-reiseziele/januar",
        page_type="other",
        language="de",
        h1="Beste Reiseziele im Januar",
    )
    profile = build_profile([home, content], "besttravelclimate.com")
    assert profile.topics == ["Beste Reiseziele im Januar"]  # home page not consulted


def _childcare_page() -> ExtractedPage:
    # A real local business: a schema.org LocalBusiness SUBTYPE, which contains
    # none of the "organization/localbusiness/business" substrings.
    return ExtractedPage(
        final_url="https://titas-minihelden-ulm.de/",
        page_type="home",
        language="de",
        title="Tagesmutter in Ulm | Kindertagespflege Tita's Minihelden",
        h1="Liebevolle Kindertagespflege für kleine Minihelden.",
        open_graph={"og:site_name": "Tita's Minihelden Ulm"},
        json_ld=[
            {
                "@type": "ChildCare",
                "name": "Tita's Minihelden",
                "telephone": "+49 700 000000",
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "Erminger Weg 88",
                    "postalCode": "89077",
                    "addressLocality": "Ulm",
                    "addressCountry": "DE",
                },
            }
        ],
    )


def test_local_business_subtype_yields_address() -> None:
    profile = build_profile([_childcare_page()], "titas-minihelden-ulm.de")
    assert profile.locations == ["Ulm"]
    assert profile.countries == ["DE"]


def test_brand_variants_do_not_blank_out_the_brand() -> None:
    # "Tita's Minihelden" (schema) vs "Tita's Minihelden Ulm" (site identity) are
    # the same brand, so they must not read as an ambiguous pair.
    profile = build_profile([_childcare_page()], "titas-minihelden-ulm.de")
    assert profile.brand_name is not None
    assert profile.needs_confirmation is False


def test_offering_read_from_title_for_a_local_business() -> None:
    profile = build_profile([_childcare_page()], "titas-minihelden-ulm.de")
    # The location and the brand affix are stripped off the title segments.
    assert profile.services == ["Kindertagespflege", "Tagesmutter"]
    assert profile.topics == []  # offerings win, so the topic fallback stays off


def test_offering_fallback_skips_sites_without_business_identity() -> None:
    # No address/phone in schema -> a content site, which must keep the topic path
    # instead of turning its tagline into a fake service.
    page = ExtractedPage(
        final_url="https://example.test/",
        page_type="home",
        language="en",
        title="Acme — Agent Trajectory Marketplace",
        json_ld=[{"@type": "WebSite", "name": "Acme"}],
    )
    profile = build_profile([page], "example.test")
    assert profile.services == []
    assert profile.topics == ["Agent Trajectory Marketplace"]


def test_same_brand_treats_variants_as_one_name() -> None:
    from geo_worker.profile.rules import _same_brand

    assert _same_brand("Tita's Minihelden", "Tita's Minihelden Ulm")  # location suffix
    assert _same_brand("Titas Minihelden Ulm", "Tita's Minihelden Ulm")  # apostrophe
    assert not _same_brand("Tita's Minihelden", "Kita Sonnenschein")  # different brands


# --- Comparison / finder sites -------------------------------------------------
# A site that lists products it does not sell says so in its own Product schema:
# the offer's seller is the manufacturer and the offer URL points off-domain.
# Shape taken from a real page on selectyoursauna.com.


def _finder_pages(seller: str = "Karibu", offer_host: str = "www.karibu.de") -> list[ExtractedPage]:
    home = ExtractedPage(
        final_url="https://selectyoursauna.com/",
        page_type="home",
        language="de",
        title="Select Your Sauna",
        open_graph={"og:site_name": "Select Your Sauna"},
        json_ld=[{"@type": "Organization", "name": "Select Your Sauna"}],
    )
    products = [
        ExtractedPage(
            final_url=f"https://selectyoursauna.com/de/produkte/{slug}/",
            page_type="product",
            language="de",
            json_ld=[
                {
                    "@type": "Product",
                    "name": name,
                    "brand": {"@type": "Brand", "name": seller},
                    "category": category,
                    "offers": [
                        {
                            "@type": "Offer",
                            "url": f"https://{offer_host}/sauna/aussensauna/",
                            "price": 7999.99,
                            "seller": {"@type": "Organization", "name": seller},
                        }
                    ],
                }
            ],
        )
        for slug, name, category in (
            ("monterey", "Karibu Saunahaus Monterey", "Finnische Sauna"),
            ("fjora-l", "Artsauna Fjora L", "Sauna > Fasssauna"),
        )
    ]
    return [home, *products]


def test_products_sold_by_a_third_party_are_flagged() -> None:
    profile = build_profile(_finder_pages(), "selectyoursauna.com")
    assert profile.catalog_mode == "third_party"
    assert profile.third_party_products == ["artsauna fjora l", "karibu saunahaus monterey"]
    # The breadcrumb category keeps its leaf, which is what a buyer searches for.
    assert profile.product_categories == ["fasssauna", "finnische sauna"]
    assert profile.offering_display["finnische sauna"] == "Finnische Sauna"


def test_a_shop_selling_its_own_products_is_not_a_finder() -> None:
    profile = build_profile(
        _finder_pages(seller="Select Your Sauna", offer_host="selectyoursauna.com"),
        "selectyoursauna.com",
    )
    assert profile.catalog_mode == "own"
    assert profile.third_party_products == []
    assert profile.product_categories == ["fasssauna", "finnische sauna"]
