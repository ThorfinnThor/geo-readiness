"""Deterministic page-type classification (§10 page types).

Rule-based on URL path first, then heading/title keywords. DE + EN keywords.
"""

from __future__ import annotations

from urllib.parse import urlsplit

# Ordered (type, keywords). First match on the URL path wins; more specific
# types are listed before generic ones.
_PATH_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("legal", ("impressum", "imprint", "datenschutz", "privacy", "terms", "agb", "legal")),
    ("contact", ("kontakt", "contact")),
    ("pricing", ("preise", "pricing", "kosten", "tarife")),
    ("about", ("ueber-uns", "ueber", "about", "unternehmen", "company", "team")),
    ("faq", ("faq", "haeufige-fragen", "questions")),
    ("case_study", ("case-study", "case-studies", "referenz", "referenzen", "projekte", "cases")),
    ("location", ("standort", "standorte", "location", "locations", "filialen")),
    ("service", ("leistung", "leistungen", "service", "services", "dienstleistung")),
    ("product", ("produkt", "produkte", "product", "products", "shop")),
    ("guide", ("guide", "ratgeber", "wissen", "resources", "guides")),
    ("blog", ("blog", "news", "aktuelles", "magazin", "artikel")),
]


def classify_page(final_url: str, title: str | None, headings: dict[str, list[str]]) -> str:
    """Classify a page into one of the §10 page types."""
    path = urlsplit(final_url).path.strip("/").lower()

    if path in ("", "index", "home", "index.html"):
        return "home"

    for page_type, keywords in _PATH_RULES:
        if any(kw in path for kw in keywords):
            return page_type

    # Fall back to heading/title keywords.
    haystack = " ".join([title or "", *headings.get("h1", []), *headings.get("h2", [])]).lower()
    for page_type, keywords in _PATH_RULES:
        if any(kw in haystack for kw in keywords):
            return page_type

    return "other"


def classify_link(href: str, text: str) -> str | None:
    """Best-effort page type for a link target, from its path then anchor text.

    Lets identity/policy/contact/about pages count as present when the site
    links to them (e.g. footer links) even if that page was not crawled — the
    link itself is evidence the page exists and is reachable. Returns None when
    nothing matches. Path is authoritative; anchor text is a fallback for footer
    labels like "Impressum" / "Datenschutz" / "Privacy".
    """
    path = urlsplit(href).path.strip("/").lower()
    for page_type, keywords in _PATH_RULES:
        if any(kw in path for kw in keywords):
            return page_type
    label = (text or "").strip().lower()
    for page_type, keywords in _PATH_RULES:
        if any(kw in label for kw in keywords):
            return page_type
    return None
