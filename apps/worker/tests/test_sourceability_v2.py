"""Sourceability V2 + applicability tests (§102–103, §131)."""

from __future__ import annotations

import datetime as dt

from geo_worker.extraction.types import ExtractedPage, PageSignals
from geo_worker.methodology.v2.sourceability import _WEIGHTS, _assess, sourceability_component
from geo_worker.scoring.types import SignalStatus

AS_OF = dt.datetime(2026, 8, 20, 12, 0, tzinfo=dt.UTC)


def _page(page_type: str, **signal_kwargs) -> ExtractedPage:
    return ExtractedPage(
        final_url="https://s.example/p",
        title="Title",
        h1="Heading",
        page_type=page_type,
        signals=PageSignals(**signal_kwargs),
    )


def _score(pages) -> float:
    return sourceability_component(pages, AS_OF)[0].score


def _status(pages, key) -> SignalStatus:
    return next(a.status for a in _assess(pages, AS_OF) if a.key == key)


# --- §102 ---


def test_weights_sum_to_100() -> None:
    assert sum(w for _, w in _WEIGHTS) == 100


def test_specific_numeric_information_scores() -> None:
    quant = _score([_page("service", main_word_count=200, quantified_information_count=10)])
    none = _score([_page("service", main_word_count=200, quantified_information_count=0)])
    assert quant > none


def test_citations_improve_evidence_attribution() -> None:
    cited = _score([_page("service", external_citation_count=3, main_word_count=100)])
    plain = _score([_page("service", main_word_count=100)])
    assert cited > plain


def test_real_table_improves_extractability_empty_does_not() -> None:
    data = _score([_page("service", data_table_count=1)])
    empty = _score([_page("service", table_count=1, data_table_count=0)])
    assert data > empty


def test_answer_block_improves_answerability() -> None:
    answered = _score([_page("service", faq_answer_count=3)])
    none = _score([_page("service")])
    assert answered > none


def test_recent_date_beats_future_on_applicable_page() -> None:
    recent = _score([_page("pricing", date_modified=dt.date(2026, 7, 1))])
    future = _score(
        [_page("pricing", date_published=dt.date(2099, 1, 1), invalid_future_date=True)]
    )
    assert recent > future


def test_numbers_alone_cannot_max_sourceability() -> None:
    assert _score([_page("service", main_word_count=200, quantified_information_count=50)]) < 100.0


# --- §103 applicability ---


def test_about_freshness_is_not_applicable() -> None:
    assert _status([_page("about")], "declared_freshness") is SignalStatus.not_applicable


def test_blog_author_is_applicable() -> None:
    assert _status([_page("blog")], "author_responsibility") is not SignalStatus.not_applicable


def test_pricing_individual_author_not_required() -> None:
    assert _status([_page("pricing")], "author_responsibility") is SignalStatus.not_applicable


def test_not_applicable_excluded_from_denominator() -> None:
    # Only a service page → freshness + author both N/A → assessed weight < 100.
    _, diag = sourceability_component([_page("service")], AS_OF)
    assert diag.assessed_weight_ratio < 1.0


def test_missing_applicable_signal_scores_zero() -> None:
    # A blog page with no author present → author applicable but missing (strength 0).
    a = next(a for a in _assess([_page("blog")], AS_OF) if a.key == "author_responsibility")
    assert a.status is SignalStatus.missing
    assert a.strength == 0.0
