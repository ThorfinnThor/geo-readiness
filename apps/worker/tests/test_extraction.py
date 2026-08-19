"""Deterministic HTML extraction tests (E05)."""

from __future__ import annotations

from pathlib import Path

import pytest

from geo_worker.extraction import extract_page
from geo_worker.extraction.classify import classify_page

FIXTURES = Path(__file__).parent / "fixtures" / "html"


def _load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_local_business_extraction() -> None:
    page = extract_page(_load("local_business.html"), "https://mueller-solar.example/")

    assert page.title == "Müller Solar GmbH — Photovoltaik in Ulm"
    assert page.meta_description == "Photovoltaik und Speicher für Ulm und Umgebung."
    assert page.canonical_url == "https://mueller-solar.example/"
    assert page.robots_meta == "index,follow"
    assert page.language == "de"
    assert page.hreflang == ["de", "en"]
    assert page.h1 == "Photovoltaik für Ulm"
    assert page.headings["h2"] == ["Unsere Leistungen", "Standort"]
    assert page.open_graph["og:title"] == "Müller Solar GmbH"

    # JSON-LD parsed.
    assert len(page.json_ld) == 1
    assert page.json_ld[0]["@type"] == "LocalBusiness"

    # Homepage classification.
    assert page.page_type == "home"

    # Visible text present; script/style content excluded.
    assert "Solaranlagen" in page.visible_text
    assert "tracking pixel" not in page.visible_text
    assert "display: none" not in page.visible_text


def test_link_internal_external_split() -> None:
    page = extract_page(_load("local_business.html"), "https://mueller-solar.example/")
    internal = {link.href for link in page.internal_links}
    external = {link.href for link in page.external_links}

    assert "https://mueller-solar.example/leistungen" in internal
    assert "https://mueller-solar.example/kontakt" in internal
    assert "https://partner.example/zertifikat" in external
    # mailto: and #fragment links are dropped entirely.
    assert all("mailto:" not in href for href in internal | external)


def test_invalid_jsonld_is_safe() -> None:
    page = extract_page(_load("broken_jsonld.html"), "https://example.com/")
    # Two invalid blocks skipped, one valid block kept — no exception.
    assert len(page.json_ld) == 1
    assert page.json_ld[0]["name"] == "Valid One"


def test_hash_is_stable_and_content_sensitive() -> None:
    html = _load("local_business.html")
    a = extract_page(html, "https://mueller-solar.example/")
    b = extract_page(html, "https://mueller-solar.example/")
    assert a.content_hash == b.content_hash
    assert a.content_hash != ""

    changed = extract_page(
        html.replace("Solaranlagen", "Wärmepumpen"), "https://mueller-solar.example/"
    )
    assert changed.content_hash != a.content_hash


def test_empty_html_does_not_raise() -> None:
    page = extract_page("", "https://example.com/")
    assert page.title is None
    assert page.visible_text == ""
    assert page.json_ld == []


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://x.example/", "home"),
        ("https://x.example/impressum", "legal"),
        ("https://x.example/kontakt", "contact"),
        ("https://x.example/leistungen/photovoltaik", "service"),
        ("https://x.example/produkte", "product"),
        ("https://x.example/preise", "pricing"),
        ("https://x.example/blog/2026/solar", "blog"),
        ("https://x.example/ueber-uns", "about"),
        ("https://x.example/random-page", "other"),
    ],
)
def test_classify_by_path(url: str, expected: str) -> None:
    assert classify_page(url, None, {}) == expected
