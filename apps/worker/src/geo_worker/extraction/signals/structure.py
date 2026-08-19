"""Main-content selection + semantic structure detection (§15–21).

Conservative: main content is <main> → <article> → <body>, with nav/footer/
header/aside (and scripts) pruned. Empty/layout tables and short lists get no
credit. Operates on the parse tree AFTER V1's visible_text is captured, so V1
output is unaffected.
"""

from __future__ import annotations

from selectolax.parser import HTMLParser, Node

from ..types import PageSignalEvidence, PageSignals
from .citations import extract_citations
from .quantitative import extract_quantitative

_NON_CONTENT = "nav, footer, header, aside, script, style, noscript, template"
_MIN_LIST_ITEMS = 3
_MIN_ITEM_CHARS = 10
_MIN_TABLE_TEXT = 20
_MAX_EVIDENCE = 5
_SNIPPET = 240


def _norm(text: str) -> str:
    return " ".join(text.split())


def _select_main(tree: HTMLParser) -> Node | None:
    for selector in ("main", "article", "body"):
        node = tree.css_first(selector)
        if node is not None:
            return node
    return None


def _is_data_table(table: Node) -> tuple[bool, bool]:
    """Return (is_data_table, is_comparison_table)."""
    meaningful_rows = 0
    max_cols = 0
    text_len = 0
    for row in table.css("tr"):
        cells = row.css("td, th")
        if len(cells) >= 2:
            meaningful_rows += 1
            max_cols = max(max_cols, len(cells))
            text_len += len(_norm(row.text(strip=True) or ""))
    is_data = meaningful_rows >= 2 and max_cols >= 2 and text_len >= _MIN_TABLE_TEXT
    return is_data, (is_data and max_cols >= 3)


def extract_page_signals(tree: HTMLParser, final_url: str = "") -> PageSignals:
    """Build the additive PageSignals from the (already script-stripped) tree."""
    signals = PageSignals()
    main = _select_main(tree)
    if main is None:
        return signals

    for node in main.css(_NON_CONTENT):
        node.decompose()

    signals.main_text = _norm(main.text(separator=" ", strip=True) or "")
    signals.main_word_count = len(signals.main_text.split())

    evidence: list[PageSignalEvidence] = []

    # Tables.
    tables = main.css("table")
    signals.table_count = len(tables)
    for table in tables:
        is_data, is_comparison = _is_data_table(table)
        if is_data:
            signals.data_table_count += 1
            if is_comparison:
                signals.comparison_structure_count += 1
            if len(evidence) < _MAX_EVIDENCE:
                evidence.append(
                    PageSignalEvidence(
                        signal="data_table",
                        snippet=_norm(table.text(strip=True) or "")[:_SNIPPET],
                    )
                )

    # Lists.
    ordered = main.css("ol")
    signals.ordered_list_count = len(ordered)
    signals.unordered_list_count = len(main.css("ul"))
    dls = main.css("dl")
    signals.definition_list_count = len(dls)

    # Procedures: an ordered list with >= 3 substantive items.
    for ol in ordered:
        items = [
            li for li in ol.css("li") if len(_norm(li.text(strip=True) or "")) >= _MIN_ITEM_CHARS
        ]
        if len(items) >= _MIN_LIST_ITEMS:
            signals.procedural_step_count += len(items)
            if len(evidence) < _MAX_EVIDENCE:
                evidence.append(
                    PageSignalEvidence(
                        signal="procedure",
                        value=len(items),
                        snippet=_norm(ol.text(strip=True) or "")[:_SNIPPET],
                    )
                )

    # Definitions: dl with dt+dd, plus <dfn>.
    for dl in dls:
        if dl.css_first("dt") is not None and dl.css_first("dd") is not None:
            signals.definition_structure_count += 1
    signals.definition_structure_count += len(main.css("dfn"))

    # Quotes.
    quotes = main.css("blockquote")
    signals.blockquote_count = len(quotes)
    for q in quotes:
        if q.css_first("cite") is not None or q.attributes.get("cite"):
            signals.attributed_quote_count += 1

    # Quantified information (§22–28) over the main content.
    quant = extract_quantitative(signals.main_text)
    signals.percentage_count = quant.percentage_count
    signals.currency_value_count = quant.currency_value_count
    signals.measurement_count = quant.measurement_count
    signals.quantified_count_count = quant.quantified_count_count
    signals.quantified_information_count = quant.total
    for kind, snippet in quant.evidence:
        if len(evidence) < _MAX_EVIDENCE:
            evidence.append(PageSignalEvidence(signal=f"quantified_{kind}", snippet=snippet))

    # Main-content external citations (§29–31).
    cites = extract_citations(main, final_url)
    signals.external_citation_count = cites.external_citation_count
    signals.external_citation_domains = cites.external_citation_domains
    for host, anchor in cites.evidence:
        if len(evidence) < _MAX_EVIDENCE:
            evidence.append(
                PageSignalEvidence(signal="external_citation", value=host, snippet=anchor)
            )

    signals.evidence = evidence
    return signals
