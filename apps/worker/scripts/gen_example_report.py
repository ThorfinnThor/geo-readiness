"""Generate the example report JSON the web UI renders (E12/E13).

Runs the full pipeline on a synthetic demo site (no network) and writes the
report contract to apps/web/lib/report/example-report.json. The demo site is a
realistic small business with real gaps, so the preview paywall shows genuine
issues. Re-run after report shape changes:

    uv run python scripts/gen_example_report.py
"""

from __future__ import annotations

import json
from pathlib import Path

from geo_worker.crawler.types import RawResponse
from geo_worker.pipeline import build_report, run_pipeline

PUBLIC = "93.184.216.34"
BASE = "https://brightsolar.example"
LEAD = "BrightSolar installs rooftop solar panels and home battery storage for "
BODY = "customers across Central Texas. Our team handles design, permitting and install. "


def _page(html: str) -> RawResponse:
    return RawResponse(200, {"content-type": "text/html"}, html.encode("utf-8"))


def _site() -> dict[str, RawResponse]:
    # Brand resolves (title + og:site_name + domain) but there is NO structured
    # data, no about/contact/legal/reference pages, and thin service pages — so
    # the engine surfaces several real, evidence-backed issues.
    return {
        f"{BASE}/": _page(
            "<html lang='en'><head><title>BrightSolar — Solar Installation in Austin</title>"
            '<meta property="og:site_name" content="BrightSolar"/></head><body>'
            "<h1>BrightSolar</h1>"
            "<a href='/services/solar-panels'>Solar Panels</a>"
            "<a href='/services/battery-storage'>Battery Storage</a>"
            "<a href='/pricing'>Pricing</a>"
            f"<p>{LEAD}{BODY}{BODY}</p></body></html>"
        ),
        f"{BASE}/services/solar-panels": _page(
            "<h1>Solar Panels</h1><p>We install solar panels.</p>"
        ),
        f"{BASE}/services/battery-storage": _page(
            "<h1>Battery Storage</h1><p>We install home batteries.</p>"
        ),
        f"{BASE}/pricing": _page(
            f"<h1>Pricing</h1><p>Systems start around $12,000 before incentives. {BODY}</p>"
        ),
    }


def main() -> None:
    site = _site()

    def fetch(url: str, _ip: str, _max: int) -> RawResponse:
        for key in (url, url.rstrip("/"), url + "/"):
            if key in site:
                return site[key]
        return RawResponse(404, {}, b"")

    scan = run_pipeline(
        f"{BASE}/",
        scan_type="full",
        fetch_fn=fetch,
        resolver=lambda _h: [PUBLIC],
    )
    report = build_report(scan)

    out = (
        Path(__file__).resolve().parents[3]
        / "apps"
        / "web"
        / "lib"
        / "report"
        / "example-report.json"
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(report.model_dump(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"wrote {out} (overall {report.overall_score}, {len(report.actions)} actions)")


if __name__ == "__main__":
    main()
