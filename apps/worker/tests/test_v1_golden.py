"""V1 golden regression (V2 §105) — a permanent compatibility gate.

geo-readiness-v1 output MUST NOT change while V2 is built. If this fails, V1
behavior drifted — investigate before touching the golden file.
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

from geo_worker.crawler.types import RawResponse
from geo_worker.pipeline import build_report, run_pipeline

GOLDEN = Path(__file__).parent / "golden" / "v1_report.json"
PUBLIC = "93.184.216.34"
# Pinned so the report envelope (meta.as_of) is deterministic.
FIXED_AS_OF = dt.datetime(2026, 1, 1, tzinfo=dt.UTC)
LONG = "We install rooftop solar and home battery storage with clear specs. " * 10
ORG = (
    '<script type="application/ld+json">'
    '{"@type":"Organization","name":"BrightSolar","url":"https://golden.example/",'
    '"legalName":"BrightSolar Inc.",'
    '"address":{"@type":"PostalAddress","addressLocality":"Austin","addressCountry":"US"}}'
    "</script>"
)


def _site() -> dict[str, RawResponse]:
    def page(html: str) -> RawResponse:
        return RawResponse(200, {"content-type": "text/html"}, html.encode("utf-8"))

    b = "https://golden.example"
    return {
        f"{b}/": page(
            "<html lang='en'><head><title>BrightSolar — Solar in Austin</title>"
            '<meta property="og:site_name" content="BrightSolar"/>'
            f"{ORG}</head><body><h1>BrightSolar</h1>"
            "<a href='/about'>About</a><a href='/services/solar'>Solar</a>"
            "<a href='/pricing'>Pricing</a><a href='/contact'>Contact</a>"
            f"<p>{LONG}</p></body></html>"
        ),
        f"{b}/about": page(f"<h1>About BrightSolar</h1><p>{LONG}</p>"),
        f"{b}/services/solar": page(f"<h1>Solar Installation</h1><p>{LONG} 25 year warranty.</p>"),
        f"{b}/pricing": page(f"<h1>Pricing</h1><p>Systems from $12,000. {LONG}</p>"),
        f"{b}/contact": page(f"<h1>Contact</h1><p>{LONG}</p>"),
    }


def build_v1_report_dict() -> dict:
    site = _site()

    def fetch(url: str, _ip: str, _max: int) -> RawResponse:
        for key in (url, url.rstrip("/"), url + "/"):
            if key in site:
                return site[key]
        return RawResponse(404, {}, b"")

    scan = run_pipeline(
        "https://golden.example/",
        scan_type="full",
        methodology_version="geo-readiness-v1",
        fetch_fn=fetch,
        resolver=lambda _h: [PUBLIC],
        as_of=FIXED_AS_OF,
    )
    return build_report(scan).model_dump()


def test_geo_readiness_v1_golden_output_unchanged() -> None:
    expected = json.loads(GOLDEN.read_text(encoding="utf-8"))
    assert build_v1_report_dict() == expected
