"""V2 de-proxied trust: credit identity/policy pages the site links to (§ Stripe fix)."""

from __future__ import annotations

from geo_worker.crawler.types import RawResponse
from geo_worker.extraction.classify import classify_link
from geo_worker.pipeline import run_pipeline

PUBLIC = "93.184.216.34"
LONG = "We build deterministic developer tooling with clear, documented APIs. " * 8


def test_classify_link_matches_locale_and_labels() -> None:
    assert classify_link("/de/legal/imprint", "") == "legal"
    assert classify_link("/de/privacy", "") == "legal"
    assert classify_link("/de/contact/sales", "") == "contact"
    assert classify_link("/company/about", "") == "about"
    assert classify_link("/x", "Impressum") == "legal"  # anchor-text fallback
    assert classify_link("/x", "Read more") is None


def test_v2_credits_linked_identity_pages_not_crawled() -> None:
    # Homepage links to imprint/privacy/contact in the footer, but those pages are
    # not crawlable (404) — the links alone must credit the trust signals.
    home = (
        "<html lang='en'><head><title>Acme Dev</title>"
        "<meta property='og:site_name' content='Acme'/></head><body>"
        "<h1>Acme</h1>"
        f"<p>{LONG}</p>"
        "<footer><a href='/legal/imprint'>Imprint</a>"
        "<a href='/privacy'>Privacy</a><a href='/contact'>Contact</a></footer>"
        "</body></html>"
    )
    site = {"https://acme.example/": RawResponse(200, {"content-type": "text/html"}, home.encode())}

    def fetch(url, _ip, _max):
        return site.get(url.rstrip("/") + "/", RawResponse(404, {}, b""))

    scan = run_pipeline(
        "https://acme.example/",
        methodology_version="geo-readiness-v2",
        fetch_fn=fetch,
        resolver=lambda _h: [PUBLIC],
    )
    trust = next(c for c in scan.readiness.components if c.name == "evidence_trust")
    subs = {s.name: s.strength for s in trust.subscores}
    assert subs["contact_legal_identity"] == 1.0  # contact + legal both linked
    assert subs["policies_terms_privacy"] == 1.0
    assert subs["about_transparency"] == 0.0  # no about page linked here
