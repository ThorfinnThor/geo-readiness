"""Additive V2 page-signal extraction (§12–21).

Structural signals for now (main content, tables, lists, definitions,
procedures, comparisons, quotes). Quantitative/citation/authorship/date/answer
signals arrive in later phases.
"""

from .structure import extract_page_signals

__all__ = ["extract_page_signals"]
