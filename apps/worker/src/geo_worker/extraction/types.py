"""Typed extraction result.

V1 fields are preserved exactly. V2 (§12–13) adds a nested, additive
``PageSignals`` structure — it never feeds V1 profile/coverage/scoring or the
content hash, so V1 output is unchanged.
"""

from __future__ import annotations

import datetime as dt

from pydantic import BaseModel, Field


class Link(BaseModel):
    href: str
    text: str


class PageSignalEvidence(BaseModel):
    signal: str
    value: str | float | int | bool | None = None
    snippet: str | None = None
    href: str | None = None
    source: str | None = None


class PageSignals(BaseModel):
    """Additive V2 page signals (§13). Fields not yet populated by a given phase
    keep their defaults; later phases fill quantitative/citation/author/date."""

    main_text: str = ""
    main_word_count: int = 0

    table_count: int = 0
    data_table_count: int = 0

    ordered_list_count: int = 0
    unordered_list_count: int = 0
    definition_list_count: int = 0

    blockquote_count: int = 0
    attributed_quote_count: int = 0

    faq_answer_count: int = 0
    procedural_step_count: int = 0
    definition_structure_count: int = 0
    comparison_structure_count: int = 0

    percentage_count: int = 0
    currency_value_count: int = 0
    measurement_count: int = 0
    quantified_count_count: int = 0
    quantified_information_count: int = 0

    external_citation_count: int = 0
    external_citation_domains: list[str] = Field(default_factory=list)

    author_names: list[str] = Field(default_factory=list)
    organization_author_present: bool = False

    date_published: dt.date | None = None
    date_modified: dt.date | None = None
    visible_date: dt.date | None = None

    invalid_future_date: bool = False
    inconsistent_dates: bool = False

    evidence: list[PageSignalEvidence] = Field(default_factory=list)


class ExtractedPage(BaseModel):
    final_url: str
    title: str | None = None
    meta_description: str | None = None
    canonical_url: str | None = None
    robots_meta: str | None = None
    language: str | None = None
    hreflang: list[str] = []
    h1: str | None = None
    headings: dict[str, list[str]] = {}
    visible_text: str = ""
    json_ld: list[dict] = []
    open_graph: dict[str, str] = {}
    internal_links: list[Link] = []
    external_links: list[Link] = []
    page_type: str = "other"
    content_hash: str = ""
    signals: PageSignals = Field(default_factory=PageSignals)
