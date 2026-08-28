"""Adversarial / anti-gaming fixtures: pages that TRY to inflate a signal.

Each case is a deliberate gaming attempt; the assertion is that the signal does
NOT reward it. This locks in the anti-gaming guarantees the methodology promises
(a signal that can be trivially gamed should not be in the core score).
"""

from __future__ import annotations

import datetime as dt

from geo_worker.extraction import extract_page
from geo_worker.extraction.signals.dates import validate_page_dates

AS_OF = dt.datetime(2026, 8, 28, tzinfo=dt.UTC)


def _sig(body: str):
    return extract_page(f"<html lang='de'><body>{body}</body></html>", "https://ex.example/")


def test_digit_stuffing_is_not_quantified_information() -> None:
    # Phone, SKU, postcode, order id, copyright year — digits bound to no unit.
    sig = _sig(
        "<main><p>Rufen Sie 030 1234567. Artikelnr SKU-99823. Bestellung #100234. "
        "10115 Berlin. © 2026 Alle Rechte vorbehalten.</p></main>"
    )
    assert sig.signals.quantified_information_count == 0


def test_real_quantified_facts_still_count() -> None:
    # Counterfactual to the above: numbers bound to units DO count.
    sig = _sig("<main><p>8,4 kW Leistung, 92% Deckung, 25 Jahre Garantie, 1.200 Kunden.</p></main>")
    assert sig.signals.quantified_information_count > 0


def test_future_date_is_flagged_invalid_not_fresh() -> None:
    sig = _sig("<main><p>Stand 01.01.2099. Immer aktuell.</p></main>")
    validate_page_dates(sig.signals, AS_OF)
    assert sig.signals.invalid_future_date is True


def test_copyright_year_is_not_a_freshness_date() -> None:
    sig = _sig("<main><p>Willkommen.</p></main><footer>© 2026 Beispiel GmbH</footer>")
    assert sig.signals.visible_date is None


def test_empty_faq_is_not_a_direct_answer() -> None:
    # A question heading with no substantive answer after it must score zero.
    sig = _sig("<main><h2>Was ist eine Sauna?</h2><h2>Noch eine Frage?</h2></main>")
    assert sig.signals.faq_answer_count == 0


def test_empty_table_is_not_extractable_structure() -> None:
    # A header-only table carries no data rows and must not count as a data table.
    sig = _sig("<main><table><tr><th>Merkmal</th><th>Wert</th></tr></table></main>")
    assert sig.signals.data_table_count == 0
