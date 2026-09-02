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
