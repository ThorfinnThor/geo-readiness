"""Quantitative + citation signal tests (§22–32, §100, §127)."""

from __future__ import annotations

from geo_worker.extraction import extract_page

URL = "https://ex.example/"


def _sig(main_html: str, extra: str = ""):
    html = f"<html lang='en'><body>{extra}<main>{main_html}</main></body></html>"
    return extract_page(html, URL).signals


def test_percentage_detected() -> None:
    assert _sig("<p>Our panels reach 22% efficiency.</p>").percentage_count >= 1


def test_currency_detected() -> None:
    assert _sig("<p>Systems from $12,000 installed.</p>").currency_value_count >= 1


def test_measurement_detected() -> None:
    assert _sig("<p>Each panel weighs 21 kg on the roof.</p>").measurement_count >= 1


def test_specific_count_detected() -> None:
    assert _sig("<p>We have served 500 customers so far.</p>").quantified_count_count >= 1


def test_phone_number_excluded() -> None:
    s = _sig("<p>Call us at +49 731 123456 any weekday.</p>")
    assert s.quantified_information_count == 0


def test_postcode_excluded() -> None:
    s = _sig("<p>We are located in 89073 Ulm, Germany.</p>")
    assert s.quantified_information_count == 0


def test_footer_year_excluded() -> None:
    s = _sig("<p>Solar for homes.</p>", extra="<footer>© 2026 BrightSolar</footer>")
    assert s.quantified_information_count == 0


def test_specific_information_beats_bare_digits() -> None:
    bare = _sig("<p>Reference 12345 and internal code 99887 here.</p>")
    specific = _sig("<p>22% efficiency, $499 price, 10 kg panels, 500 customers.</p>")
    assert specific.quantified_information_count > bare.quantified_information_count
    assert bare.quantified_information_count == 0


def test_main_content_external_citation_detected() -> None:
    s = _sig("<p>Per the <a href='https://nrel.gov/study'>NREL study</a> efficiency rose.</p>")
    assert s.external_citation_count >= 1
    assert "nrel.gov" in s.external_citation_domains


def test_footer_link_is_not_a_citation() -> None:
    s = _sig(
        "<p>Solar content.</p>",
        extra="<footer><a href='https://partner.example/x'>Partner</a></footer>",
    )
    assert s.external_citation_count == 0


def test_social_links_are_not_citations() -> None:
    s = _sig("<p>Follow <a href='https://linkedin.com/company/x'>us on LinkedIn</a>.</p>")
    assert s.external_citation_count == 0
