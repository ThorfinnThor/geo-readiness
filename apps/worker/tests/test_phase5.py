"""Authorship, dates, and direct-answerability tests (§33–38, §100, §128)."""

from __future__ import annotations

import datetime as dt

from geo_worker.extraction import extract_page
from geo_worker.extraction.signals.dates import validate_page_dates

URL = "https://ex.example/"
AS_OF = dt.datetime(2026, 8, 19, 12, 0, tzinfo=dt.UTC)


def _page(body: str, head: str = ""):
    return extract_page(f"<html lang='en'><head>{head}</head><body>{body}</body></html>", URL)


def _ld(obj: str) -> str:
    return f'<script type="application/ld+json">{obj}</script>'


# --- authorship ---


def test_jsonld_person_author_detected() -> None:
    s = _page(
        "<p>x</p>", _ld('{"@type":"BlogPosting","author":{"@type":"Person","name":"Jane Doe"}}')
    ).signals
    assert "Jane Doe" in s.author_names
    assert s.organization_author_present is False


def test_jsonld_org_author_detected() -> None:
    s = _page(
        "<p>x</p>",
        _ld('{"@type":"Article","author":{"@type":"Organization","name":"BrightSolar"}}'),
    ).signals
    assert s.organization_author_present is True


def test_meta_author_detected() -> None:
    s = _page("<p>x</p>", '<meta name="author" content="John Smith"/>').signals
    assert "John Smith" in s.author_names


# --- dates ---


def test_published_and_modified_detected() -> None:
    s = _page(
        "<p>x</p>",
        _ld('{"@type":"Article","datePublished":"2024-01-01","dateModified":"2024-06-01"}'),
    ).signals
    assert s.date_published == dt.date(2024, 1, 1)
    assert s.date_modified == dt.date(2024, 6, 1)
    assert s.inconsistent_dates is False


def test_inconsistent_dates_flagged() -> None:
    s = _page(
        "<p>x</p>",
        _ld('{"@type":"Article","datePublished":"2024-06-01","dateModified":"2024-01-01"}'),
    ).signals
    assert s.inconsistent_dates is True


def test_time_element_visible_date() -> None:
    s = _page('<time datetime="2026-01-15">January 2026</time>').signals
    assert s.visible_date == dt.date(2026, 1, 15)


def test_future_date_flagged_against_as_of() -> None:
    page = _page("<p>x</p>", _ld('{"@type":"Article","datePublished":"2099-01-01"}'))
    assert page.signals.invalid_future_date is False  # not yet validated
    validate_page_dates(page.signals, AS_OF)
    assert page.signals.invalid_future_date is True


# --- direct answerability ---


def test_faq_jsonld_answer_detected() -> None:
    ld = _ld(
        '{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"How much?",'
        '"acceptedAnswer":{"@type":"Answer","text":"$499."}}]}'
    )
    assert _page("<p>x</p>", ld).signals.faq_answer_count >= 1


def test_details_answer_detected() -> None:
    s = _page(
        "<main><details><summary>How long?</summary><p>About a day.</p></details></main>"
    ).signals
    assert s.faq_answer_count >= 1


def test_question_heading_with_answer_detected() -> None:
    s = _page(
        "<main><h2>How much does installation cost?</h2>"
        "<p>It costs $499 for the standard package, fully installed.</p></main>"
    ).signals
    assert s.faq_answer_count >= 1


def test_empty_faq_has_no_answers() -> None:
    s = _page("<main><h1>FAQ</h1></main>").signals
    assert s.faq_answer_count == 0
