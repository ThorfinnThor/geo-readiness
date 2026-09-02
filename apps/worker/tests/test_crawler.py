"""Crawl orchestration tests (E04) — deterministic, no network."""

from __future__ import annotations

from geo_worker.crawler import crawl
from geo_worker.crawler.types import CrawlStatus, RawResponse
from geo_worker.security import CrawlLimits

PUBLIC = "93.184.216.34"
LIMITS = CrawlLimits(
    max_pages=5,
    max_depth=2,
    max_response_bytes=2000,
    max_total_bytes=100_000,
    max_browser_renders=1,
    max_redirects=5,
)


def _resolver(host: str) -> list[str]:
    return ["10.0.0.1"] if host == "internal.example" else [PUBLIC]


class FakeSite:
    def __init__(self) -> None:
        self.routes: dict[str, RawResponse] = {}

    def page(self, path: str, html: str, **kw) -> None:
        self.add(path, html.encode("utf-8"), headers={"content-type": "text/html"}, **kw)

    def add(self, path: str, body: bytes, *, status: int = 200, headers=None) -> None:
        self.routes[f"https://ex.example{path}"] = RawResponse(status, headers or {}, body)

    def fetch(self, url: str, _ip: str, _max_bytes: int) -> RawResponse:
        for key in (url, url.rstrip("/"), url + "/"):
            if key in self.routes:
                return self.routes[key]
        return RawResponse(404, {}, b"")


def _run(site: FakeSite, **kw):
    return crawl(
        "https://ex.example/", limits=LIMITS, fetch_fn=site.fetch, resolver=_resolver, **kw
    )


def test_basic_crawl_follows_internal_links_and_dedupes() -> None:
    site = FakeSite()
    site.page(
        "/", "<h1>Home</h1><a href='/about'>a</a><a href='/leistungen/x'>s</a><a href='/'>home</a>"
    )
    site.page("/about", "<h1>About</h1>")
    site.page("/leistungen/x", "<h1>Service</h1>")
    result = _run(site)
    urls = {p.final_url for p in result.pages}
    assert "https://ex.example/" in urls
    assert "https://ex.example/about" in urls
    assert "https://ex.example/leistungen/x" in urls
    assert result.homepage_reachable is True
    assert result.status == CrawlStatus.completed
    # Home linked to itself but was fetched once.
    assert result.metrics.pages_fetched == 3


def test_page_budget_cannot_be_exceeded() -> None:
    site = FakeSite()
    links = "".join(f"<a href='/p{i}'>{i}</a>" for i in range(20))
    site.page("/", f"<h1>Home</h1>{links}")
    for i in range(20):
        site.page(f"/p{i}", f"<h1>Page {i}</h1>")
    result = _run(site)
    assert result.metrics.pages_fetched <= LIMITS.max_pages
    assert result.status == CrawlStatus.partial  # frontier still had URLs


def test_robots_disallow_is_respected() -> None:
    site = FakeSite()
    site.add("/robots.txt", b"User-agent: *\nDisallow: /private\n")
    site.page("/", "<h1>Home</h1><a href='/private/secret'>x</a><a href='/ok'>ok</a>")
    site.page("/private/secret", "<h1>Secret</h1>")
    site.page("/ok", "<h1>OK</h1>")
    result = _run(site)
    urls = {p.final_url for p in result.pages}
    assert "https://ex.example/private/secret" not in urls
    assert "https://ex.example/ok" in urls
    assert result.metrics.robots_skipped >= 1


def test_redirect_followed_and_internal_redirect_blocked() -> None:
    site = FakeSite()
    site.page("/", "<h1>Home</h1><a href='/old'>o</a><a href='/evil'>e</a>")
    site.add("/old", b"", status=301, headers={"location": "/new"})
    site.page("/new", "<h1>New</h1>")
    site.add("/evil", b"", status=302, headers={"location": "https://internal.example/"})
    result = _run(site)
    urls = {p.final_url for p in result.pages}
    assert "https://ex.example/new" in urls
    assert result.metrics.redirects_followed >= 1
    assert result.metrics.ssrf_blocked >= 1  # redirect to internal host rejected


def test_ssrf_seed_blocked_yields_failed() -> None:
    site = FakeSite()
    site.page("/", "<h1>Home</h1>")
    result = crawl(
        "https://internal.example/", limits=LIMITS, fetch_fn=site.fetch, resolver=_resolver
    )
    assert result.status == CrawlStatus.failed
    assert result.pages == []


def test_browser_render_cap_not_exceeded() -> None:
    site = FakeSite()
    # Two JS-thin pages; render budget is 1.
    site.page("/", "<a href='/thin1'>1</a><a href='/thin2'>2</a>")
    site.page("/thin1", "<h1>.</h1>")
    site.page("/thin2", "<h1>.</h1>")
    renders: list[str] = []

    def render(url: str) -> str:
        renders.append(url)
        return "<h1>Rendered</h1>" + ("content " * 60)

    result = _run(site, render_fn=render)
    assert result.metrics.browser_renders <= LIMITS.max_browser_renders
    assert len(renders) <= LIMITS.max_browser_renders


def test_cancellation_yields_partial_or_cancelled() -> None:
    site = FakeSite()
    links = "".join(f"<a href='/p{i}'>{i}</a>" for i in range(10))
    site.page("/", f"<h1>Home</h1>{links}")
    for i in range(10):
        site.page(f"/p{i}", f"<h1>{i}</h1>")

    state = {"n": 0}

    def cancel() -> bool:
        state["n"] += 1
        return state["n"] > 2

    result = _run(site, should_cancel=cancel)
    assert result.status == CrawlStatus.cancelled
    assert result.metrics.pages_fetched < 10


def test_oversized_and_non_html_are_handled() -> None:
    site = FakeSite()
    site.page("/", "<h1>Home</h1><a href='/big'>b</a><a href='/doc'>d</a>")
    site.add("/big", b"x" * 5000, headers={"content-type": "text/html"})  # > max_response_bytes
    site.add("/doc", b"%PDF-1.4", headers={"content-type": "application/pdf"})
    result = _run(site)
    urls = {p.final_url for p in result.pages}
    assert "https://ex.example/big" not in urls  # oversized → error, not parsed
    assert "https://ex.example/doc" not in urls  # non-html → skipped
    assert result.metrics.errors >= 1


def test_production_transport_is_importable() -> None:
    # No network call — just guard the httpx adapter against import/syntax breakage.
    from geo_worker.crawler.transport import httpx_fetch

    assert callable(httpx_fetch)


def test_sitemap_urls_are_seeded() -> None:
    site = FakeSite()
    site.add("/robots.txt", b"Sitemap: https://ex.example/sitemap.xml\n")
    site.add(
        "/sitemap.xml",
        b"<urlset><url><loc>https://ex.example/from-sitemap</loc></url></urlset>",
        headers={"content-type": "application/xml"},
    )
    site.page("/", "<h1>Home</h1>")
    site.page("/from-sitemap", "<h1>From Sitemap</h1>")
    result = _run(site)
    urls = {p.final_url for p in result.pages}
    assert "https://ex.example/from-sitemap" in urls


def test_frontier_ranks_translated_copies_last() -> None:
    from geo_worker.crawler.frontier import Frontier

    f = Frontier()
    f.set_primary_locale("de")
    f.enqueue("https://x.example/en/beste-reiseziele/april", 1)
    f.enqueue("https://x.example/de/beste-reiseziele/april", 1)
    first, _ = f.pop()
    assert first.endswith("/de/beste-reiseziele/april")  # primary language wins


def test_frontier_reprioritises_queue_once_locale_is_known() -> None:
    # Sitemap seeds are enqueued before the first page is fetched, so the queue
    # must be re-ordered when the primary language becomes known.
    from geo_worker.crawler.frontier import Frontier

    f = Frontier()
    f.enqueue("https://x.example/fr/guide", 1)
    f.enqueue("https://x.example/de/guide", 1)
    f.set_primary_locale("de")
    first, _ = f.pop()
    assert first.endswith("/de/guide")


def test_frontier_leaves_non_localised_urls_and_type_order_untouched() -> None:
    from geo_worker.crawler.frontier import Frontier

    f = Frontier()
    f.set_primary_locale("de")
    f.enqueue("https://x.example/some/article", 2)  # no locale prefix
    f.enqueue("https://x.example/impressum", 1)  # legal ranks above 'other'
    first, _ = f.pop()
    assert first.endswith("/impressum")  # existing type priority is unchanged
