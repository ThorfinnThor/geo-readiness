"""Main HTML extraction (§11).

Order matters: JSON-LD is read before <script> nodes are stripped for the
visible-text pass.
"""

from __future__ import annotations

from urllib.parse import urljoin, urlsplit

from selectolax.parser import HTMLParser

from .classify import classify_page
from .hashing import content_hash
from .jsonld import extract_jsonld
from .signals import extract_page_signals
from .types import ExtractedPage, Link

_SKIP_SCHEMES = ("mailto:", "tel:", "javascript:", "data:")
_HEADING_TAGS = ("h1", "h2", "h3")


def _first_text(tree: HTMLParser, selector: str) -> str | None:
    node = tree.css_first(selector)
    if node is None:
        return None
    text = node.text(strip=True)
    return text or None


def _attr(tree: HTMLParser, selector: str, name: str) -> str | None:
    node = tree.css_first(selector)
    if node is None:
        return None
    value = node.attributes.get(name)
    return value or None


def _normalize_ws(text: str) -> str:
    return " ".join(text.split())


def extract_page(html: str, final_url: str) -> ExtractedPage:
    """Extract structured, evidence-ready fields from a page's HTML."""
    tree = HTMLParser(html or "")

    # JSON-LD first (before scripts are stripped).
    json_ld = extract_jsonld(tree)

    title = _first_text(tree, "title")
    meta_description = _attr(tree, 'meta[name="description"]', "content")
    robots_meta = _attr(tree, 'meta[name="robots"]', "content")
    language = _attr(tree, "html", "lang")

    canonical_raw = _attr(tree, 'link[rel="canonical"]', "href")
    canonical_url = urljoin(final_url, canonical_raw) if canonical_raw else None

    hreflang = sorted(
        {
            node.attributes["hreflang"]
            for node in tree.css("link[hreflang]")
            if node.attributes.get("hreflang")
        }
    )

    open_graph: dict[str, str] = {}
    for node in tree.css("meta"):
        prop = node.attributes.get("property")
        content = node.attributes.get("content")
        if prop and prop.startswith("og:") and content:
            open_graph.setdefault(prop, content)

    headings: dict[str, list[str]] = {}
    for tag in _HEADING_TAGS:
        texts = [_normalize_ws(n.text(strip=True)) for n in tree.css(tag)]
        texts = [t for t in texts if t]
        if texts:
            headings[tag] = texts
    h1 = headings.get("h1", [None])[0]

    internal_links, external_links = _extract_links(tree, final_url)

    # Visible text (V1 semantics, unchanged): strip non-content nodes, flatten body.
    for node in tree.css("script, style, noscript, template"):
        node.decompose()
    body = tree.css_first("body")
    visible_text = _normalize_ws(body.text(separator=" ", strip=True)) if body else ""

    # V2 additive signals (main content + structure). Computed after visible_text,
    # so the tree pruning it performs cannot affect V1 output.
    signals = extract_page_signals(tree)

    page = ExtractedPage(
        final_url=final_url,
        title=title,
        meta_description=meta_description,
        canonical_url=canonical_url,
        robots_meta=robots_meta,
        language=language,
        hreflang=hreflang,
        h1=h1,
        headings=headings,
        visible_text=visible_text,
        json_ld=json_ld,
        open_graph=open_graph,
        internal_links=internal_links,
        external_links=external_links,
        signals=signals,
    )
    page.page_type = classify_page(final_url, title, headings)
    page.content_hash = content_hash(page)
    return page


def _extract_links(tree: HTMLParser, final_url: str) -> tuple[list[Link], list[Link]]:
    page_host = urlsplit(final_url).hostname
    internal: list[Link] = []
    external: list[Link] = []
    seen: set[str] = set()

    for node in tree.css("a"):
        href = node.attributes.get("href")
        if not href:
            continue
        href = href.strip()
        low = href.lower()
        if not href or href.startswith("#") or low.startswith(_SKIP_SCHEMES):
            continue

        absolute = urljoin(final_url, href)
        parts = urlsplit(absolute)
        if parts.scheme not in ("http", "https"):
            continue
        # Drop the fragment for dedup/storage.
        absolute = parts._replace(fragment="").geturl()
        if absolute in seen:
            continue
        seen.add(absolute)

        link = Link(href=absolute, text=_normalize_ws(node.text(strip=True)))
        if parts.hostname == page_host:
            internal.append(link)
        else:
            external.append(link)

    return internal, external
