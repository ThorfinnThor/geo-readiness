"""Unicode-safe tokenization (§39).

NFKC + casefold, preserving Unicode letters/digits (München, Wärmepumpe, für).
The V1 ASCII-oriented helper is not reused for V2 topical alignment.
"""

from __future__ import annotations

import re
import unicodedata

# Word runs of Unicode letters/digits (\w minus underscore).
_TOKEN = re.compile(r"[^\W_]+", re.UNICODE)
# Very common function words that carry little topical signal (EN + DE).
_STOPWORDS = frozenset(
    {
        "the",
        "a",
        "an",
        "of",
        "and",
        "or",
        "for",
        "to",
        "in",
        "on",
        "is",
        "are",
        "welche",
        "gibt",
        "es",
        "für",
        "und",
        "oder",
        "die",
        "der",
        "das",
        "ein",
        "eine",
        "man",
        "was",
        "wie",
        "sind",
        "bei",
        "mit",
        "von",
        "sich",
        "which",
        "what",
        "how",
        "who",
        "you",
        "your",
        "with",
    }
)


def tokenize(text: str, *, drop_stopwords: bool = False) -> list[str]:
    if not text:
        return []
    norm = unicodedata.normalize("NFKC", text).casefold()
    tokens = _TOKEN.findall(norm)
    if drop_stopwords:
        return [t for t in tokens if t not in _STOPWORDS]
    return tokens


def token_set(text: str) -> frozenset[str]:
    return frozenset(tokenize(text))
