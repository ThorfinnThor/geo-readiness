"""Live V2 calibration against the real benchmark corpus (§Phase 14).

Runs the geo_v2_benchmark_websites corpus (15 positive / 15 negative / 5 edge)
through the V2 methodology over the REAL network transport (with the crawler's
SSRF validation + robots), then checks the validation rules from the corpus doc:

  * median(positive overall) materially > median(negative overall)
  * most positive-vs-negative pairs rank the positive higher
  * signal-level spot checks (quantified / direct-answer / dates / attribution)

Quick scans (<=12 pages/site) — enough for relative validation, polite to hosts.

    uv run python scripts/run_live_benchmark.py          # V2 only
    uv run python scripts/run_live_benchmark.py --with-v1 # also score V1 (2x crawl)

Outputs: benchmark_out/live_report.{md,json}. Network-dependent, so NOT wired
into pytest; the deterministic fixture harness (tests/test_benchmark.py) is the
CI gate.
"""

from __future__ import annotations

import statistics
import sys
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path

from geo_worker.crawler.transport import httpx_fetch
from geo_worker.pipeline import run_pipeline
from geo_worker.security.resolver import system_resolver

OUT = Path(__file__).resolve().parents[1] / "benchmark_out"

# (id, class, url, expected) — from geo_v2_benchmark_websites.md.
CORPUS: list[tuple[str, str, str, str]] = [
    ("P01", "positive", "https://docs.stripe.com/", "high"),
    ("P02", "positive", "https://developers.cloudflare.com/", "high"),
    ("P03", "positive", "https://developer.mozilla.org/en-US/docs/Web/HTTP", "high"),
    ("P04", "positive", "https://developers.google.com/search/docs", "high"),
    ("P05", "positive", "https://www.gov.uk/set-up-business", "high"),
    ("P06", "positive", "https://www.nhs.uk/conditions/asthma/", "high"),
    ("P07", "positive", "https://www.mayoclinic.org/diseases-conditions", "high"),
    ("P08", "positive", "https://learn.microsoft.com/", "high"),
    (
        "P09",
        "positive",
        "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html",
        "high",
    ),
    ("P10", "positive", "https://help.shopify.com/en/manual", "high"),
    ("P11", "positive", "https://ahrefs.com/blog/", "high"),
    ("P12", "positive", "https://zapier.com/blog/", "high"),
    ("P13", "positive", "https://en.wikipedia.org/wiki/Artificial_intelligence", "high"),
    ("P14", "positive", "https://www.hubspot.com/resources", "high"),
    ("P15", "positive", "https://docs.github.com/en", "high"),
    ("N01", "negative", "https://example.com/", "low"),
    ("N02", "negative", "https://example.org/", "low"),
    ("N03", "negative", "https://example.net/", "low"),
    ("N04", "negative", "https://info.cern.ch/", "low"),
    ("N05", "negative", "https://www.milliondollarhomepage.com/", "low"),
    ("N06", "negative", "https://www.spacejam.com/1996/", "low"),
    ("N07", "negative", "https://cat-bounce.com/", "low"),
    ("N08", "negative", "https://pointerpointer.com/", "low"),
    ("N09", "negative", "https://checkboxrace.com/", "low"),
    ("N10", "negative", "https://theuselessweb.com/", "low"),
    ("N11", "negative", "https://heeeeeeeey.com/", "low"),
    ("N12", "negative", "https://papertoilet.com/", "low"),
    ("N13", "negative", "https://koalastothemax.com/", "low"),
    ("N14", "negative", "https://www.rrrgggbbb.com/", "low"),
    ("N15", "negative", "https://www.bouncingdvdlogo.com/", "low"),
    ("E01", "edge", "https://www.berkshirehathaway.com/", "mixed"),
    ("E02", "edge", "https://www.paulgraham.com/articles.html", "mixed"),
    ("E03", "edge", "https://stallman.org/", "mixed"),
    ("E04", "edge", "https://www.craigslist.org/about/sites", "mixed"),
    ("E05", "edge", "https://httpbin.org/", "mixed"),
]


@dataclass
class SiteResult:
    id: str
    cls: str
    url: str
    expected: str
    ok: bool
    error: str = ""
    pages: int = 0
    crawl_status: str = ""
    overall: float | None = None
    components: dict[str, float] = field(default_factory=dict)
    signals: dict[str, float] = field(default_factory=dict)  # sourceability subscores
    stages: dict[str, float | None] = field(default_factory=dict)
    v1_overall: float | None = None


def _score(url: str, version: str) -> object:
    return run_pipeline(
        url,
        scan_type="quick",
        methodology_version=version,
        fetch_fn=httpx_fetch,
        resolver=system_resolver,
    )


def _run_site(entry: tuple[str, str, str, str], with_v1: bool) -> SiteResult:
    sid, cls, url, expected = entry
    res = SiteResult(id=sid, cls=cls, url=url, expected=expected, ok=False)
    try:
        scan = _score(url, "geo-readiness-v2")
        r = scan.readiness
        res.ok = True
        res.pages = scan.pages_analyzed
        res.crawl_status = scan.crawl_status
        res.overall = r.overall_score
        res.components = {c.name: c.score for c in r.components}
        src = next((c for c in r.components if c.name == "sourceability"), None)
        if src is not None:
            res.signals = {s.name: s.strength for s in src.subscores}
        res.stages = {
            "retrieval_readiness": r.retrieval_readiness_score,
            "citation_readiness": r.citation_readiness_score,
            "answer_extractability": r.answer_extractability_score,
        }
        if with_v1:
            res.v1_overall = _score(url, "geo-readiness-v1").readiness.overall_score
    except Exception as exc:  # network / crawl failures must not abort the sweep
        res.error = f"{type(exc).__name__}: {exc}"[:300]
    return res


def _median(xs: list[float]) -> float | None:
    return round(statistics.median(xs), 2) if xs else None


def _fmt(v: float | None) -> str:
    return f"{v:.1f}" if v is not None else "—"


# Signal-level expectations called out in the corpus doc (id → checks).
# Each check: (signal, direction, threshold). direction "high"→>=, "low"→<=.
SIGNAL_CHECKS: dict[str, list[tuple[str, str, float]]] = {
    "N09": [("quantified_information", "low", 0.4)],
    "N08": [("semantic_extractability", "low", 0.4), ("direct_answerability", "low", 0.4)],
    "P06": [("direct_answerability", "high", 0.5)],
    "P09": [("declared_freshness", "high", 0.4)],
    "P13": [("evidence_attribution", "high", 0.5)],
    "E01": [("first_party_evidence_depth", "high", 0.4)],
    "E02": [("author_responsibility", "high", 0.4)],
}


def main() -> None:
    with_v1 = "--with-v1" in sys.argv
    results: list[SiteResult] = []
    for entry in CORPUS:
        t0 = time.monotonic()
        r = _run_site(entry, with_v1)
        dt = time.monotonic() - t0
        results.append(r)
        status = "ok" if r.ok else f"ERR {r.error}"
        print(
            f"{r.id} {r.cls:8} overall={_fmt(r.overall):>5} "
            f"pages={r.pages:>2} {status}  ({dt:.1f}s)  {r.url}",
            flush=True,
        )

    pos = [r.overall for r in results if r.cls == "positive" and r.overall is not None]
    neg = [r.overall for r in results if r.cls == "negative" and r.overall is not None]
    med_pos, med_neg = _median(pos), _median(neg)

    # Pairwise: fraction of (positive, negative) pairs where positive ranks higher.
    pairs = [(p, n) for p in pos for n in neg]
    pair_ok = sum(1 for p, n in pairs if p > n)
    pair_frac = round(pair_ok / len(pairs), 4) if pairs else None

    # Signal-level spot checks.
    by_id = {r.id: r for r in results}
    signal_report: list[dict] = []
    for sid, checks in SIGNAL_CHECKS.items():
        r = by_id.get(sid)
        if not r or not r.ok:
            signal_report.append({"id": sid, "ok": False, "note": "no result"})
            continue
        for sig, direction, thr in checks:
            val = r.signals.get(sig)
            passed = val is not None and (
                (direction == "high" and val >= thr) or (direction == "low" and val <= thr)
            )
            signal_report.append(
                {
                    "id": sid,
                    "signal": sig,
                    "direction": direction,
                    "threshold": thr,
                    "value": round(val, 3) if val is not None else None,
                    "pass": bool(passed),
                }
            )

    summary = {
        "median_positive": med_pos,
        "median_negative": med_neg,
        "separation": round(med_pos - med_neg, 2) if med_pos and med_neg else None,
        "pairwise_positive_higher": pair_frac,
        "n_positive_ok": len(pos),
        "n_negative_ok": len(neg),
        "errors": [{"id": r.id, "url": r.url, "error": r.error} for r in results if not r.ok],
    }

    _write_reports(results, summary, signal_report, with_v1)
    print("\n=== SUMMARY ===")
    print(
        f"median positive={med_pos} vs negative={med_neg} "
        f"(separation={summary['separation']}); pairwise pos>neg={pair_frac}"
    )
    print(f"errors: {len(summary['errors'])}/{len(CORPUS)}")


def _write_reports(results, summary, signal_report, with_v1) -> None:
    import json

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "live_report.json").write_text(
        json.dumps(
            {
                "summary": summary,
                "signal_checks": signal_report,
                "sites": [asdict(r) for r in results],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    def row(r: SiteResult) -> str:
        v1 = f" {_fmt(r.v1_overall)} |" if with_v1 else ""
        return (
            f"| {r.id} | {r.cls} | {_fmt(r.overall)} |{v1}"
            f" {r.pages} | {'ok' if r.ok else r.error[:40]} | {r.url} |"
        )

    v1h = " V1 |" if with_v1 else ""
    v1s = "---|" if with_v1 else ""
    ok = [r for r in results if r.ok]
    lines = [
        "# V2 live benchmark & calibration report",
        "",
        "Real-network quick scans of the benchmark corpus. Relative validation "
        "(median + pairwise), not exact targets.",
        "",
        "## Validation rules",
        "",
        f"- Median positive overall: **{summary['median_positive']}**",
        f"- Median negative overall: **{summary['median_negative']}**",
        f"- Separation (pos − neg): **{summary['separation']}**",
        f"- Pairwise positive-ranks-higher: **{summary['pairwise_positive_higher']}** "
        f"({summary['n_positive_ok']}×{summary['n_negative_ok']} pairs)",
        f"- Sites failed: **{len(summary['errors'])}/{len(results)}**",
        "",
        "## Signal-level spot checks",
        "",
        "| id | signal | want | thr | value | pass |",
        "|---|---|---|---|---|---|",
    ]
    for s in signal_report:
        if "signal" in s:
            lines.append(
                f"| {s['id']} | {s['signal']} | {s['direction']} | {s['threshold']} "
                f"| {s['value']} | {'✓' if s['pass'] else '✗'} |"
            )
    lines += [
        "",
        "## All sites (sorted by V2 overall)",
        "",
        f"| id | class | V2 |{v1h} pages | status | url |",
        f"|---|---|---|{v1s}---|---|---|",
    ]
    for r in sorted(ok, key=lambda x: -(x.overall or 0)) + [r for r in results if not r.ok]:
        lines.append(row(r))
    (OUT / "live_report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {OUT / 'live_report.md'} and {OUT / 'live_report.json'}")


if __name__ == "__main__":
    main()
