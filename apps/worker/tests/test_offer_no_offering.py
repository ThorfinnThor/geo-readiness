"""A weak Offer Clarity with no detected offering must still produce an action.

Regression for the "Offer Clarity 0 but 0 issues found" contradiction: RDY-002
only covers sites whose services exist, so a site with no offering scored 0 with
no finding. RDY-002B fills that gap."""

from __future__ import annotations

from geo_worker.crawler.types import RawResponse
from geo_worker.pipeline import run_pipeline

PUBLIC = "93.184.216.34"


def _fetch(site: dict):
    def fetch(url, _ip, _max):
        for key in (url, url.rstrip("/"), url + "/"):
            if key in site:
                return site[key]
        return RawResponse(404, {}, b"")

    return fetch


def test_no_offering_still_produces_an_offer_action() -> None:
    site = {
        "https://ex.example/": RawResponse(
            200,
            {"content-type": "text/html"},
            b"<html><body><h1>Ex</h1><p>hello world</p></body></html>",
        )
    }
    scan = run_pipeline(
        "https://ex.example/",
        methodology_version="geo-readiness-v2",
        fetch_fn=_fetch(site),
        resolver=lambda _h: [PUBLIC],
    )
    offer = next(c.score for c in scan.readiness.components if c.name == "offer_clarity")
    ids = {a.rule_id for a in scan.actions}
    assert offer < 50  # weak offer clarity
    assert "RDY-002B" in ids  # "State what you offer" — no longer 0 issues
    # And the weak component now has a matching action, so the report is consistent.
    assert any(a.category == "offer" for a in scan.actions)
