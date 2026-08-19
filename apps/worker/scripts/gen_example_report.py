"""Generate the example report JSON the web UI renders (E12/E13).

Runs the full pipeline on a synthetic demo site (no network) and writes the
report contract to apps/web/lib/report/example-report.json. Re-run after report
shape changes:  uv run python scripts/gen_example_report.py
"""

from __future__ import annotations

import json
from pathlib import Path

from geo_worker.crawler.types import RawResponse
from geo_worker.pipeline import build_report, run_pipeline

PUBLIC = "93.184.216.34"
LONG = "Wir bieten Photovoltaik, Stromspeicher und Beratung mit vielen Fakten. " * 14

ORG = (
    '<script type="application/ld+json">'
    '{"@context":"https://schema.org","@type":"LocalBusiness","name":"Acme Solar",'
    '"url":"https://acme-solar.example/","legalName":"Acme Solar GmbH",'
    '"telephone":"+49 731 000",'
    '"address":{"@type":"PostalAddress","addressLocality":"Ulm","addressCountry":"DE"},'
    '"datePublished":"2026-01-01"}'
    "</script>"
)


def _page(html: str) -> RawResponse:
    return RawResponse(200, {"content-type": "text/html"}, html.encode("utf-8"))


def _site() -> dict[str, RawResponse]:
    base = "https://acme-solar.example"
    return {
        f"{base}/": _page(
            "<html lang='de'><head><title>Acme Solar — Photovoltaik in Ulm</title>"
            '<meta property="og:site_name" content="Acme Solar"/>'
            '<link rel="canonical" href="https://acme-solar.example/"/>'
            f"{ORG}</head><body><h1>Acme Solar</h1>"
            "<a href='/ueber-uns'>Über uns</a>"
            "<a href='/leistungen/photovoltaik'>Photovoltaik</a>"
            "<a href='/leistungen/speicher'>Stromspeicher</a>"
            "<a href='/produkte/solarmodul'>Solarmodul</a>"
            "<a href='/preise'>Preise</a><a href='/kontakt'>Kontakt</a>"
            "<a href='/impressum'>Impressum</a><a href='/referenzen'>Referenzen</a>"
            f"<a href='/faq'>FAQ</a><p>{LONG}</p></body></html>"
        ),
        f"{base}/ueber-uns": _page(
            "<html><head><title>Über uns</title></head><body>"
            f"<h1>Über uns Acme Solar</h1><p>{LONG}</p></body></html>"
        ),
        f"{base}/leistungen/photovoltaik": _page(
            f"<h1>Photovoltaik</h1><p>Photovoltaik in Ulm mit 25 Jahren Garantie. {LONG}</p>"
        ),
        f"{base}/leistungen/speicher": _page(
            f"<h1>Stromspeicher</h1><p>Speicher mit 10 kWh. {LONG}</p>"
        ),
        f"{base}/produkte/solarmodul": _page(f"<h1>Solarmodul</h1><p>400 Wp Modul. {LONG}</p>"),
        f"{base}/preise": _page(f"<h1>Preise</h1><p>Ab 9.900 EUR. {LONG}</p>"),
        f"{base}/kontakt": _page(f"<h1>Kontakt</h1><p>{LONG}</p>"),
        f"{base}/impressum": _page(f"<h1>Impressum</h1><p>{LONG}</p>"),
        f"{base}/referenzen": _page(f"<h1>Referenzen</h1><p>Projekt in Ulm. {LONG}</p>"),
        f"{base}/faq": _page(f"<h1>FAQ</h1><p>Häufige Fragen. {LONG}</p>"),
    }


def main() -> None:
    site = _site()

    def fetch(url: str, _ip: str, _max: int) -> RawResponse:
        for key in (url, url.rstrip("/"), url + "/"):
            if key in site:
                return site[key]
        return RawResponse(404, {}, b"")

    scan = run_pipeline(
        "https://acme-solar.example/",
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
