"""V2 additive page-signal extraction tests (§16–21, §100)."""

from __future__ import annotations

from geo_worker.extraction import extract_page

URL = "https://ex.example/"


def _sig(body: str, head: str = ""):
    html = f"<html lang='en'><head>{head}</head><body>{body}</body></html>"
    return extract_page(html, URL)


def test_main_content_excludes_nav_and_footer_and_keeps_v1_visible_text() -> None:
    page = _sig(
        "<nav>Home About Menu</nav>"
        "<main><h1>Solar</h1><p>We install solar panels in Austin.</p></main>"
        "<footer>Copyright 2026 Privacy Policy</footer>"
    )
    # V2 main_text is the article only.
    assert "solar panels" in page.signals.main_text.lower()
    assert "menu" not in page.signals.main_text.lower()
    assert "copyright" not in page.signals.main_text.lower()
    assert page.signals.main_word_count > 0
    # V1 visible_text semantics unchanged — it still includes nav + footer.
    assert "menu" in page.visible_text.lower()
    assert "copyright" in page.visible_text.lower()


def test_main_fallback_to_body_prunes_nav_footer() -> None:
    page = _sig(
        "<nav>Nav Links Here</nav><h1>Topic</h1>"
        "<p>Body content about batteries.</p><footer>Footer Junk</footer>"
    )
    assert "batteries" in page.signals.main_text.lower()
    assert "nav links" not in page.signals.main_text.lower()
    assert "footer junk" not in page.signals.main_text.lower()


def test_real_data_table_and_comparison_detected() -> None:
    page = _sig(
        "<main><table>"
        "<tr><th>Feature</th><th>Basic</th><th>Pro</th></tr>"
        "<tr><td>Price</td><td>$9</td><td>$29</td></tr>"
        "<tr><td>Users</td><td>1</td><td>10</td></tr>"
        "</table></main>"
    )
    assert page.signals.data_table_count == 1
    assert page.signals.comparison_structure_count == 1  # >= 3 columns


def test_empty_table_gets_no_credit() -> None:
    page = _sig("<main><table><tr><td></td></tr></table><p>text</p></main>")
    assert page.signals.table_count == 1
    assert page.signals.data_table_count == 0
    assert page.signals.comparison_structure_count == 0


def test_ordered_procedure_detected() -> None:
    page = _sig(
        "<main><ol>"
        "<li>First, prepare the roof surface carefully.</li>"
        "<li>Second, mount the panel rails securely.</li>"
        "<li>Third, connect the wiring to the inverter.</li>"
        "</ol></main>"
    )
    assert page.signals.ordered_list_count == 1
    assert page.signals.procedural_step_count == 3


def test_short_list_is_not_a_procedure() -> None:
    page = _sig("<main><ol><li>Only one substantive item here.</li><li>Two.</li></ol></main>")
    assert page.signals.procedural_step_count == 0


def test_definition_structure_detected() -> None:
    page = _sig("<main><dl><dt>kWp</dt><dd>Kilowatt peak, a measure of capacity.</dd></dl></main>")
    assert page.signals.definition_list_count == 1
    assert page.signals.definition_structure_count >= 1


def test_attributed_blockquote_detected() -> None:
    page = _sig(
        "<main><blockquote>Great service.<cite>Jane Doe</cite></blockquote>"
        "<blockquote>Just a quote.</blockquote></main>"
    )
    assert page.signals.blockquote_count == 2
    assert page.signals.attributed_quote_count == 1


def test_signals_are_additive_no_content_hash_change() -> None:
    # Two identical pages produce identical content hashes; signals don't leak in.
    a = _sig("<main><p>same</p></main>")
    b = _sig("<main><p>same</p></main>")
    assert a.content_hash == b.content_hash
    assert a.content_hash != ""
