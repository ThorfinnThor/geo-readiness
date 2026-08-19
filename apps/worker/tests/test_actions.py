"""Action engine tests (E11) — evidence-backed, deterministic, no visibility claims."""

from __future__ import annotations

from geo_worker.actions import compute_actions
from geo_worker.clusters import generate_clusters
from geo_worker.coverage import compute_coverage
from geo_worker.extraction.types import ExtractedPage, Link
from geo_worker.profile.types import BusinessProfile, EvidenceItem
from geo_worker.scoring import compute_readiness
from geo_worker.scoring.types import CrawlMeta

MV = "geo-readiness-v1"
META = CrawlMeta(pages_requested=12, pages_crawled=10)

# Wording that would imply measured AI visibility — must never appear (§25/§0).
FORBIDDEN = ("rank", "ranking", "chatgpt", "visibility", "citation", "share of voice", "will cite")


def _page(url: str, page_type: str, chash: str, **kw) -> ExtractedPage:
    return ExtractedPage(final_url=url, page_type=page_type, content_hash=chash, **kw)


def _pipeline(pages, profile):
    clusters = generate_clusters(profile, MV, "full")
    coverage = compute_coverage(clusters, pages, profile)
    readiness = compute_readiness(pages, profile, coverage, META, MV)
    return compute_actions(readiness, profile, coverage, clusters, pages)


def _weak():
    pages = [_page("https://w.example/", "other", "hw", visible_text="hi")]
    profile = BusinessProfile(canonical_domain="w.example", needs_confirmation=True)
    return pages, profile


def _strong():
    long = "Wir bieten umfassende Leistungen mit Details. " * 20
    links = [Link(href="https://acme.example/x", text="x")]
    pages = [
        _page(
            "https://acme.example/",
            "home",
            "h0",
            title="Acme",
            h1="Acme",
            canonical_url="https://acme.example/",
            internal_links=links,
            visible_text=long + " 2026",
            json_ld=[
                {
                    "@type": "Organization",
                    "name": "Acme",
                    "url": "https://acme.example/",
                    "address": {
                        "@type": "PostalAddress",
                        "addressLocality": "Berlin",
                        "addressCountry": "DE",
                    },
                    "telephone": "+49",
                    "datePublished": "2026-01-01",
                }
            ],
        ),
        _page(
            "https://acme.example/about",
            "about",
            "h1",
            title="About Acme",
            h1="About Acme",
            canonical_url="https://acme.example/about",
            internal_links=links,
            visible_text=long,
        ),
        _page(
            "https://acme.example/kontakt",
            "contact",
            "h2",
            canonical_url="https://acme.example/kontakt",
            internal_links=links,
            visible_text=long,
        ),
        _page(
            "https://acme.example/impressum",
            "legal",
            "h3",
            canonical_url="https://acme.example/impressum",
            internal_links=links,
            visible_text=long,
        ),
        _page(
            "https://acme.example/leistungen/one",
            "service",
            "h4",
            title="one",
            h1="one",
            canonical_url="https://acme.example/leistungen/one",
            internal_links=links,
            visible_text=long + " 42",
            json_ld=[{"@type": "Service", "name": "one"}],
        ),
        _page(
            "https://acme.example/referenzen",
            "case_study",
            "h5",
            canonical_url="https://acme.example/referenzen",
            internal_links=links,
            visible_text=long,
        ),
        _page(
            "https://acme.example/faq",
            "faq",
            "h6",
            canonical_url="https://acme.example/faq",
            internal_links=links,
            visible_text=long,
        ),
    ]
    profile = BusinessProfile(
        canonical_domain="acme.example",
        brand_name="Acme",
        needs_confirmation=False,
        legal_name="Acme Inc.",
        services=["one", "two"],
        products=["widget"],
        locations=["Berlin"],
        countries=["DE"],
        languages=["de"],
        target_audiences=["smb"],
        evidence=[
            EvidenceItem(field_name="service", value="one", source_type="json_ld", confidence=0.9)
        ],
    )
    return pages, profile


def test_every_action_has_evidence_and_is_ordered() -> None:
    actions = _pipeline(*_weak())
    assert actions, "weak site should yield actions"
    for a in actions:
        assert a.evidence, f"{a.rule_id} has no evidence"
    priorities = [a.priority_score for a in actions]
    assert priorities == sorted(priorities, reverse=True)


def test_entity_ambiguity_rule_fires_on_weak() -> None:
    actions = _pipeline(*_weak())
    assert "RDY-001" in {a.rule_id for a in actions}


def test_actions_are_deterministic() -> None:
    a = [x.model_dump() for x in _pipeline(*_weak())]
    b = [x.model_dump() for x in _pipeline(*_weak())]
    assert a == b


def test_no_visibility_claims() -> None:
    for pages, profile in (_weak(), _strong()):
        for a in _pipeline(pages, profile):
            blob = " ".join(
                [a.title, a.problem, a.recommendation, a.expected_signal, a.how_to_verify]
            ).lower()
            for word in FORBIDDEN:
                assert word not in blob, f"{a.rule_id} contains forbidden '{word}'"


def test_strong_site_yields_fewer_actions() -> None:
    weak = _pipeline(*_weak())
    strong = _pipeline(*_strong())
    assert len(strong) <= len(weak)
