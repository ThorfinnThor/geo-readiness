"""Quantified-information extraction (§22–28).

Replaces V1's "any digit" proxy. Counts only numbers bound to a semantic token
— a percentage, currency, measurement unit, or count noun. That binding is the
core false-positive protection (§27): bare phone numbers, postcodes, copyright
years, IDs and CSS values attach to none of these and score nothing.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .language import Vocab, load_vocab

_NUM = r"\d[\d.,]*"
_MAX_EVIDENCE = 5
_SNIPPET = 120


def _alt(words: frozenset[str]) -> str:
    # Longest first so "minutes" wins over "minute"/"m"; escape unit symbols.
    return "|".join(re.escape(w) for w in sorted(words, key=len, reverse=True))


@dataclass
class QuantitativeSignals:
    percentage_count: int = 0
    currency_value_count: int = 0
    measurement_count: int = 0
    quantified_count_count: int = 0
    evidence: list[tuple[str, str]] = field(default_factory=list)  # (signal, snippet)

    @property
    def total(self) -> int:
        return (
            self.percentage_count
            + self.currency_value_count
            + self.measurement_count
            + self.quantified_count_count
        )


def _compile(vocab: Vocab) -> dict[str, re.Pattern[str]]:
    percent_alt = "|".join(["%", *(re.escape(w) for w in vocab.percent_words)])
    return {
        "percentage": re.compile(rf"(?<![\w]){_NUM}\s?(?:{percent_alt})(?![A-Za-z])", re.I),
        "currency": re.compile(
            rf"(?<![\w])(?:[€£$]\s?{_NUM}|{_NUM}\s?(?:€|£|\$|EUR|USD|GBP|CHF))(?![A-Za-z])",
            re.I,
        ),
        "measurement": re.compile(
            rf"(?<![\w]){_NUM}\s?(?:{_alt(vocab.measurement_units)})(?![A-Za-z])", re.I
        ),
        "count": re.compile(rf"(?<![\w]){_NUM}\+?\s?(?:{_alt(vocab.count_nouns)})\b", re.I),
    }


def extract_quantitative(main_text: str, version: str = "v1") -> QuantitativeSignals:
    vocab = load_vocab(version)
    patterns = _compile(vocab)
    out = QuantitativeSignals()
    seen_spans: set[tuple[int, int]] = set()

    for category, pattern in patterns.items():
        for m in pattern.finditer(main_text):
            span = (m.start(), m.end())
            # Avoid double-counting overlapping matches across categories.
            if any(span[0] < e and s < span[1] for s, e in seen_spans):
                continue
            seen_spans.add(span)
            if category == "percentage":
                out.percentage_count += 1
            elif category == "currency":
                out.currency_value_count += 1
            elif category == "measurement":
                out.measurement_count += 1
            else:
                out.quantified_count_count += 1
            if len(out.evidence) < _MAX_EVIDENCE:
                out.evidence.append((category, m.group(0).strip()[:_SNIPPET]))
    return out
