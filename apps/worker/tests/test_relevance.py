"""Topical alignment tests (§101)."""

from __future__ import annotations

from geo_worker.clusters.types import GeneratedCluster, GeneratedPrompt
from geo_worker.extraction.types import ExtractedPage, PageSignals
from geo_worker.relevance import TopicalAlignmentEngine, tokenize


def _page(
    url: str, *, title: str = "", h1: str = "", h2: str = "", main: str = ""
) -> ExtractedPage:
    return ExtractedPage(
        final_url=url,
        title=title or None,
        h1=h1 or None,
        headings={"h2": [h2]} if h2 else {},
        signals=PageSignals(main_text=main),
    )


def _cluster(
    *, service=None, product=None, location=None, audience=None, prompts=()
) -> GeneratedCluster:
    return GeneratedCluster(
        cluster_key="k",
        intent="local",
        service=service,
        product=product,
        location=location,
        audience=audience,
        language="de",
        commercial_intent=0.8,
        relevance=0.9,
        priority=1.0,
        weight=1.0,
        template_version="1",
        prompts=[
            GeneratedPrompt(prompt_key=f"p{i}", prompt_text=t, variant_index=i, template_id="t")
            for i, t in enumerate(prompts)
        ],
    )


def _score(pages, cluster):
    return TopicalAlignmentEngine(pages).score_cluster(cluster)


def test_title_and_h1_beat_body_only() -> None:
    cl = _cluster(service="Photovoltaik")
    title = _score([_page("u", title="Photovoltaik Ulm", main="x")], cl)
    h1 = _score([_page("u", h1="Photovoltaik", main="x")], cl)
    body = _score([_page("u", main="wir bieten photovoltaik hier an")], cl)
    assert title.score > body.score
    assert h1.score > body.score


def test_service_location_colocation_rewarded() -> None:
    cl = _cluster(service="Photovoltaik", location="Ulm")
    both = _score([_page("u", title="Photovoltaik Ulm")], cl)
    one = _score([_page("u", title="Photovoltaik")], cl)
    assert both.score > one.score
    assert both.concept_coverage == 1.0


def test_prompt_overlap_contributes() -> None:
    cl = _cluster(service="Beratung", prompts=["Welche Anbieter helfen bei Photovoltaik in Ulm?"])
    with_terms = _score([_page("u", title="Beratung", main="photovoltaik ulm anbieter")], cl)
    without = _score([_page("u", title="Beratung", main="allgemeiner text ohne bezug")], cl)
    assert with_terms.score > without.score


def test_generic_tokens_downweighted_by_idf() -> None:
    engine = TopicalAlignmentEngine(
        [
            _page("a", main="solar solar"),
            _page("b", main="solar panels"),
            _page("c", main="solar quantum"),
        ]
    )
    assert engine._idf("quantum") > engine._idf("solar")  # df 1 vs 3


def test_keyword_repetition_saturates() -> None:
    cl = _cluster(service="Berlin Dentist")
    once = _score([_page("u", main="berlin dentist clinic downtown")], cl)
    fifty = _score([_page("u", main="berlin dentist " * 50)], cl)
    assert once.score == fifty.score


def test_keyword_stuffing_not_rewarded_over_titled_page() -> None:
    cl = _cluster(service="Berlin Dentist")
    titled = _score([_page("u", title="Berlin Dentist", main="short intro")], cl)
    stuffed = _score([_page("u", main="berlin dentist " * 50)], cl)
    assert stuffed.score <= titled.score


def test_best_supporting_page_selected() -> None:
    cl = _cluster(service="Photovoltaik", location="Ulm")
    weak = _page("https://x/weak", main="unrelated content about cats")
    strong = _page("https://x/strong", title="Photovoltaik Ulm")
    result = _score([weak, strong], cl)
    assert result.best_supporting_url == "https://x/strong"


def test_alignment_is_bounded_and_deterministic() -> None:
    cl = _cluster(service="Photovoltaik", location="Ulm")
    pages = [_page("u", title="Photovoltaik Ulm", main="details")]
    a = _score(pages, cl)
    b = _score(pages, cl)
    assert 0.0 <= a.score <= 100.0
    assert a.model_dump() == b.model_dump()


def test_german_unicode_tokens_preserved() -> None:
    tokens = tokenize("Straße München für Wärmepumpe")
    assert "münchen" in tokens
    assert "wärmepumpe" in tokens
