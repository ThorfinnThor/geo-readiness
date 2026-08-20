"""V2 Phase 14 — benchmark & calibration harness.

Runs a labelled corpus through BOTH methodologies and reports where V2 diverges
from V1, so weights/thresholds can be calibrated against evidence rather than
intuition. The corpus here is a deterministic, no-network fixture set spanning
readiness tiers (strong / medium / weak). Real URLs plug into the same
``BenchmarkCase`` shape later — supply a network ``fetch_fn`` and a tier label;
nothing else changes.

Design intent (§calibration): the harness makes NO scoring decisions. It only
runs the pipeline and surfaces numbers + ordering checks. Judging whether the
numbers are *right* is what the labelled tier (and, later, real URLs) is for.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from statistics import mean

from geo_worker.crawler.types import FetchFn, RawResponse
from geo_worker.pipeline import run_pipeline

# Readiness tiers, ordered worst → best. The expected ordering the harness checks.
TIERS = ("weak", "medium", "strong")
_TIER_RANK = {t: i for i, t in enumerate(TIERS)}

PUBLIC = "93.184.216.34"


def _page(html: str) -> RawResponse:
    return RawResponse(200, {"content-type": "text/html"}, html.encode("utf-8"))


def _fixture_fetch(site: dict[str, RawResponse]) -> FetchFn:
    def fetch(url: str, _ip: str, _max: int) -> RawResponse:
        for key in (url, url.rstrip("/"), url + "/"):
            if key in site:
                return site[key]
        return RawResponse(404, {}, b"")

    return fetch


@dataclass(frozen=True)
class BenchmarkCase:
    """One site to score. ``fetch_fn``+``resolver`` let real URLs slot in later."""

    name: str
    tier: str
    start_url: str
    fetch_fn: FetchFn
    resolver: Callable[[str], list[str]] = field(default=lambda _h: [PUBLIC])


@dataclass(frozen=True)
class CaseScores:
    name: str
    tier: str
    overall: float
    components: dict[str, float]
    # V2-only; None under V1.
    stages: dict[str, float | None]


@dataclass(frozen=True)
class BenchmarkReport:
    v1: list[CaseScores]
    v2: list[CaseScores]
    ordering_ok_v1: bool
    ordering_ok_v2: bool
    mean_abs_overall_delta: float
    max_overall_delta: tuple[str, float]  # (case name, |v2-v1|)


# --------------------------------------------------------------------------- #
# Fixture corpus. Three sites engineered to sit at clearly different readiness
# tiers so the ordering check is meaningful even before real URLs arrive.
# --------------------------------------------------------------------------- #

_SPEC = (
    "Our 8.4 kW rooftop systems use 21 panels rated at 400 W each, pair with a "
    "13.5 kWh battery, and carry a 25 year performance warranty. Typical installs "
    "offset about 92% of annual usage and pay back in roughly 7 years. "
)
_ORG_LD = (
    '<script type="application/ld+json">'
    '{"@context":"https://schema.org","@type":"Organization","name":"BrightSolar",'
    '"url":"https://strong.example/","legalName":"BrightSolar Inc.",'
    '"address":{"@type":"PostalAddress","addressLocality":"Austin",'
    '"addressRegion":"TX","addressCountry":"US"}}'
    "</script>"
)


def _strong_site() -> dict[str, RawResponse]:
    b = "https://strong.example"
    return {
        f"{b}/": _page(
            "<html lang='en'><head><title>BrightSolar — Solar &amp; Battery in Austin, TX</title>"
            '<meta property="og:site_name" content="BrightSolar"/>'
            f"{_ORG_LD}</head><body><h1>BrightSolar</h1>"
            "<a href='/about'>About</a><a href='/contact'>Contact</a>"
            "<a href='/services/solar'>Solar</a><a href='/services/battery'>Battery</a>"
            "<a href='/pricing'>Pricing</a><a href='/guide/solar-payback'>Payback guide</a>"
            f"<p>{_SPEC}{_SPEC}</p></body></html>"
        ),
        f"{b}/about": _page(
            "<h1>About BrightSolar</h1><p>Founded in 2016 in Austin, Texas, BrightSolar has "
            f"completed 1,200 installations across Central Texas. {_SPEC}</p>"
        ),
        f"{b}/contact": _page(
            "<h1>Contact</h1><p>Call (512) 555-0100 or visit 400 Congress Ave, Austin, TX "
            "78701. Open Mon–Fri, 8am–6pm.</p>"
        ),
        f"{b}/services/solar": _page(
            "<h1>Solar Panel Installation</h1>"
            "<table><tr><th>System</th><th>Output</th><th>Warranty</th></tr>"
            "<tr><td>Starter</td><td>6.0 kW</td><td>25 years</td></tr>"
            "<tr><td>Family</td><td>8.4 kW</td><td>25 years</td></tr></table>"
            f"<p>{_SPEC}</p>"
        ),
        f"{b}/services/battery": _page(
            f"<h1>Home Battery Storage</h1><ul><li>13.5 kWh usable capacity</li>"
            f"<li>5 kW continuous output</li><li>10 year warranty</li></ul><p>{_SPEC}</p>"
        ),
        f"{b}/pricing": _page(
            "<h1>Pricing</h1><p>Starter systems from $12,400; Family systems from $18,900 "
            f"before the 30% federal tax credit. {_SPEC}</p>"
        ),
        f"{b}/guide/solar-payback": _page(
            "<html><head><title>How solar payback works</title></head><body>"
            "<h1>How solar payback works</h1>"
            '<p>By <span rel="author">Jordan Rivera</span>, updated '
            '<time datetime="2026-02-10">February 10, 2026</time>.</p>'
            "<h2>What is solar payback?</h2>"
            "<p>Solar payback is the time for energy savings to equal system cost. "
            f"For an 8.4 kW system it is about 7 years. {_SPEC}</p>"
            "<h2>How is it calculated?</h2>"
            "<p>Divide net cost after incentives by annual savings. According to the "
            "U.S. Energy Information Administration, Texas retail electricity averaged "
            "14 cents per kWh in 2025.</p></body></html>"
        ),
    }


def _medium_site() -> dict[str, RawResponse]:
    b = "https://medium.example"
    body = (
        "We install rooftop solar and home batteries for homeowners in the area. "
        "Systems are around 8 kW and include a warranty. "
    )
    return {
        f"{b}/": _page(
            "<html lang='en'><head><title>SunHaus Solar</title>"
            '<meta property="og:site_name" content="SunHaus Solar"/></head><body>'
            "<h1>SunHaus Solar</h1>"
            "<a href='/services/solar'>Solar</a><a href='/pricing'>Pricing</a>"
            f"<p>{body}{body}</p></body></html>"
        ),
        f"{b}/services/solar": _page(f"<h1>Solar Installation</h1><p>{body}</p>"),
        f"{b}/pricing": _page(
            f"<h1>Pricing</h1><p>Systems start around $13,000 before incentives. {body}</p>"
        ),
    }


def _weak_site() -> dict[str, RawResponse]:
    b = "https://weak.example"
    return {
        f"{b}/": _page(
            "<html><head><title>Home</title></head><body><h1>Welcome</h1>"
            "<p>We do solar. Contact us to learn more about our services and quality work.</p>"
            "</body></html>"
        ),
    }


def default_corpus() -> list[BenchmarkCase]:
    return [
        BenchmarkCase(
            "strong", "strong", "https://strong.example/", _fixture_fetch(_strong_site())
        ),
        BenchmarkCase(
            "medium", "medium", "https://medium.example/", _fixture_fetch(_medium_site())
        ),
        BenchmarkCase("weak", "weak", "https://weak.example/", _fixture_fetch(_weak_site())),
    ]


def _score_case(case: BenchmarkCase, methodology_version: str) -> CaseScores:
    scan = run_pipeline(
        case.start_url,
        scan_type="full",
        methodology_version=methodology_version,
        fetch_fn=case.fetch_fn,
        resolver=case.resolver,
    )
    r = scan.readiness
    return CaseScores(
        name=case.name,
        tier=case.tier,
        overall=r.overall_score,
        components={c.name: c.score for c in r.components},
        stages={
            "retrieval_readiness": r.retrieval_readiness_score,
            "citation_readiness": r.citation_readiness_score,
            "answer_extractability": r.answer_extractability_score,
        },
    )


def _ordering_ok(scores: list[CaseScores]) -> bool:
    """True iff overall score is non-decreasing along the tier rank (weak→strong)."""
    ordered = sorted(scores, key=lambda s: _TIER_RANK[s.tier])
    return all(a.overall <= b.overall for a, b in zip(ordered, ordered[1:], strict=False))


def run_benchmark(corpus: list[BenchmarkCase] | None = None) -> BenchmarkReport:
    cases = corpus or default_corpus()
    v1 = [_score_case(c, "geo-readiness-v1") for c in cases]
    v2 = [_score_case(c, "geo-readiness-v2") for c in cases]

    by_name_v1 = {s.name: s for s in v1}
    deltas = [(s.name, abs(s.overall - by_name_v1[s.name].overall)) for s in v2]
    worst = max(deltas, key=lambda d: d[1]) if deltas else ("", 0.0)

    return BenchmarkReport(
        v1=v1,
        v2=v2,
        ordering_ok_v1=_ordering_ok(v1),
        ordering_ok_v2=_ordering_ok(v2),
        mean_abs_overall_delta=round(mean(d for _, d in deltas), 4) if deltas else 0.0,
        max_overall_delta=(worst[0], round(worst[1], 4)),
    )
