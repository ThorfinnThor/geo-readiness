"""Deterministic business-profile rules (§12).

Brand resolution uses the weighted candidate model from §12:

    0.30 structured_data
  + 0.25 repeated_site_identity
  + 0.20 about_imprint_match
  + 0.15 title_h1_consistency
  + 0.10 domain_similarity

Genuine ambiguity → brand_name unknown + needs_confirmation (never a guess).
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import Counter

from geo_worker.extraction.classify import classify_page
from geo_worker.extraction.types import ExtractedPage

from .site_type import classify_site_type
from .types import BrandCandidate, BusinessProfile, EvidenceItem

# Brand selection thresholds.
MIN_BRAND_SCORE = 0.50
AMBIGUITY_MARGIN = 0.10
AMBIGUITY_RIVAL_MIN = 0.35

_TITLE_SEPARATORS = re.compile(r"\s*[|–—:\-]\s*")
_ORG_TYPE_MARKERS = ("organization", "localbusiness", "business", "corporation", "store")
_IDENTITY_PAGE_TYPES = {"about", "legal", "contact"}

# Generic/navigational words that are never a brand on their own. A candidate
# whose tokens are ALL generic (e.g. a "Documentation" / "Dokumentation" title
# suffix on docs.stripe.com) is dropped so it can't win the brand slot. DE + EN.
_GENERIC_BRAND_TOKENS = {
    "documentation",
    "docs",
    "doc",
    "dokumentation",
    "doku",
    "blog",
    "news",
    "aktuelles",
    "home",
    "homepage",
    "startseite",
    "welcome",
    "willkommen",
    "support",
    "help",
    "hilfe",
    "faq",
    "wiki",
    "login",
    "signin",
    "anmelden",
    "account",
    "konto",
    "dashboard",
    "api",
    "reference",
    "guide",
    "guides",
    "resources",
    "developer",
    "developers",
    "shop",
    "store",
    "search",
    "suche",
    "menu",
    "page",
    "site",
    "website",
    "pricing",
    "preise",
    "contact",
    "kontakt",
    "about",
    "impressum",
    "overview",
}

# Common non-brand subdomain labels to strip when deriving the brand from the
# domain, so docs.stripe.com resolves the brand from "stripe".
_COMMON_SUBDOMAINS = {
    "www",
    "docs",
    "doc",
    "blog",
    "help",
    "support",
    "app",
    "apps",
    "api",
    "shop",
    "store",
    "dev",
    "developer",
    "developers",
    "portal",
    "account",
    "login",
    "my",
    "go",
    "get",
    "cdn",
    "static",
    "assets",
    "m",
    "mobile",
    "de",
    "en",
    "fr",
    "es",
    "it",
    "us",
    "uk",
    "eu",
}


def _tokens(text: str) -> set[str]:
    return {t for t in re.split(r"[^a-z0-9]+", text.lower()) if t}


def _norm_key(name: str) -> str:
    return " ".join(sorted(_tokens(name)))


def _domain_tokens(canonical_domain: str) -> set[str]:
    labels = canonical_domain.lower().split(".")
    # Drop the public suffix label (rough: last label; refined by PSL later).
    core = labels[:-1] if len(labels) > 1 else labels
    # Strip leading non-brand subdomains (docs/www/blog/…) so the brand label wins.
    while len(core) > 1 and core[0] in _COMMON_SUBDOMAINS:
        core = core[1:]
    return _tokens("-".join(core))


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _type_list(node: dict) -> list[str]:
    t = node.get("@type")
    if isinstance(t, str):
        return [t]
    if isinstance(t, list):
        return [x for x in t if isinstance(x, str)]
    return []


def _is_org_type(node: dict) -> bool:
    return any(marker in t.lower() for t in _type_list(node) for marker in _ORG_TYPE_MARKERS)


def _title_suffix(title: str | None) -> str | None:
    if not title:
        return None
    parts = [p.strip() for p in _TITLE_SEPARATORS.split(title) if p.strip()]
    # Brand is conventionally the last segment ("Page — Brand").
    return parts[-1] if len(parts) > 1 else None


def build_profile(
    pages: list[ExtractedPage],
    canonical_domain: str,
    confirmed_name: str | None = None,
) -> BusinessProfile:
    """Build an evidence-backed business profile from extracted pages."""
    profile = BusinessProfile(canonical_domain=canonical_domain)
    evidence: list[EvidenceItem] = []

    org_nodes = _collect_org_nodes(pages)
    _resolve_languages(pages, profile, evidence)
    _resolve_geography(org_nodes, profile, evidence)
    legal_name = _resolve_legal_name(org_nodes, pages, evidence)
    profile.legal_name = legal_name

    _resolve_brand(pages, org_nodes, canonical_domain, confirmed_name, profile, evidence)
    _resolve_offerings(pages, profile, evidence)

    profile.evidence = evidence
    profile.profile_hash = _profile_hash(profile)
    # Derived after the hash so it never affects reproducibility (§v2-plan 6).
    profile.site_type, profile.site_type_confidence = classify_site_type(pages, profile)
    return profile


def _collect_org_nodes(pages: list[ExtractedPage]) -> list[tuple[dict, ExtractedPage]]:
    out: list[tuple[dict, ExtractedPage]] = []
    for page in pages:
        for node in page.json_ld:
            if _is_org_type(node):
                out.append((node, page))
    return out


def _resolve_languages(
    pages: list[ExtractedPage], profile: BusinessProfile, evidence: list[EvidenceItem]
) -> None:
    langs: set[str] = set()
    for page in pages:
        if page.language:
            langs.add(page.language.split("-")[0].lower())
        for hl in page.hreflang:
            if hl and hl.lower() != "x-default":
                langs.add(hl.split("-")[0].lower())
    profile.languages = sorted(langs)
    for lang in profile.languages:
        evidence.append(
            EvidenceItem(field_name="language", value=lang, source_type="hreflang", confidence=0.9)
        )


def _resolve_geography(
    org_nodes: list[tuple[dict, ExtractedPage]],
    profile: BusinessProfile,
    evidence: list[EvidenceItem],
) -> None:
    countries: dict[str, str | None] = {}
    locations: dict[str, str | None] = {}
    for node, page in org_nodes:
        address = node.get("address")
        if not isinstance(address, dict):
            continue
        country = address.get("addressCountry")
        if isinstance(country, dict):
            country = country.get("name")
        if isinstance(country, str) and country.strip():
            countries.setdefault(country.strip(), page.final_url)
        locality = address.get("addressLocality")
        if isinstance(locality, str) and locality.strip():
            locations.setdefault(locality.strip(), page.final_url)

    profile.countries = sorted(countries)
    profile.locations = sorted(locations)
    for value in profile.countries:
        evidence.append(
            EvidenceItem(
                field_name="country",
                value=value,
                source_url=countries[value],
                source_type="json_ld",
                confidence=0.9,
            )
        )
    for value in profile.locations:
        evidence.append(
            EvidenceItem(
                field_name="location",
                value=value,
                source_url=locations[value],
                source_type="json_ld",
                confidence=0.9,
            )
        )


def _resolve_legal_name(
    org_nodes: list[tuple[dict, ExtractedPage]],
    pages: list[ExtractedPage],
    evidence: list[EvidenceItem],
) -> str | None:
    for node, page in org_nodes:
        legal = node.get("legalName")
        if isinstance(legal, str) and legal.strip():
            evidence.append(
                EvidenceItem(
                    field_name="legal_name",
                    value=legal.strip(),
                    source_url=page.final_url,
                    source_type="json_ld",
                    confidence=0.9,
                )
            )
            return legal.strip()
    return None


def _brand_candidates(
    pages: list[ExtractedPage],
    org_nodes: list[tuple[dict, ExtractedPage]],
    canonical_domain: str,
) -> dict[str, BrandCandidate]:
    """Gather scored candidate brand names keyed by their normalized token set.

    Candidate sources: Organization JSON-LD names, og:site_name, and title
    suffixes, plus the domain label. Corroborating signals (about/imprint and
    homepage title/h1) are matched by token-subset, so "About FlowMetrics"
    reinforces the "FlowMetrics" candidate.
    """
    display: dict[str, str] = {}  # normalized key -> first-seen display name
    org_names: set[str] = set()
    site_names: set[str] = set()
    title_suffixes: list[str] = []
    identity_token_sets: list[set[str]] = []
    home_token_sets: list[set[str]] = []

    def register(name: str) -> str:
        key = _norm_key(name)
        if key and key not in display:
            display[key] = name.strip()
        return key

    for node, _page in org_nodes:
        for field in ("name", "legalName", "alternateName"):
            val = node.get(field)
            if isinstance(val, str) and val.strip():
                org_names.add(register(val))

    for page in pages:
        site_name = page.open_graph.get("og:site_name")
        if site_name:
            site_names.add(register(site_name))
        suffix = _title_suffix(page.title)
        if suffix:
            title_suffixes.append(register(suffix))
        if page.page_type in _IDENTITY_PAGE_TYPES:
            for text in (page.title, page.h1):
                if text:
                    identity_token_sets.append(_tokens(text))
        if page.page_type == "home":
            for text in (page.title, page.h1):
                if text:
                    home_token_sets.append(_tokens(text))

    domain_tokens = _domain_tokens(canonical_domain)
    domain_key = register("-".join(sorted(domain_tokens))) if domain_tokens else ""
    repeated_suffix = {k for k, c in Counter(title_suffixes).items() if c >= 2}

    candidates: dict[str, BrandCandidate] = {}
    for key in set(display) - {""}:
        cand_tokens = _tokens(display[key])
        if not cand_tokens:
            continue
        # A purely generic/navigational name (e.g. "Documentation") is never a brand.
        if cand_tokens <= _GENERIC_BRAND_TOKENS:
            continue
        score = 0.0
        sources: list[str] = []
        if key in org_names:
            score += 0.30
            sources.append("structured_data")
        if key in site_names or key in repeated_suffix:
            score += 0.25
            sources.append("repeated_site_identity")
        if any(cand_tokens <= s for s in identity_token_sets):
            score += 0.20
            sources.append("about_imprint")
        if any(cand_tokens <= s for s in home_token_sets):
            score += 0.15
            sources.append("title_h1")
        sim = 1.0 if key == domain_key else _jaccard(cand_tokens, domain_tokens)
        if sim > 0:
            score += 0.10 * sim
            sources.append("domain")
        if score > 0:
            candidates[key] = BrandCandidate(
                name=display[key], score=round(score, 4), sources=sorted(set(sources))
            )
    return candidates


def _resolve_brand(
    pages: list[ExtractedPage],
    org_nodes: list[tuple[dict, ExtractedPage]],
    canonical_domain: str,
    confirmed_name: str | None,
    profile: BusinessProfile,
    evidence: list[EvidenceItem],
) -> None:
    if confirmed_name and confirmed_name.strip():
        profile.brand_name = confirmed_name.strip()
        profile.brand_confidence = 1.0
        profile.needs_confirmation = False
        evidence.append(
            EvidenceItem(
                field_name="brand_name",
                value=profile.brand_name,
                source_type="user_confirmed",
                confidence=1.0,
            )
        )
        return

    candidates = _brand_candidates(pages, org_nodes, canonical_domain)
    ranked = sorted(candidates.values(), key=lambda c: (-c.score, c.name))
    best = ranked[0] if ranked else None
    second = ranked[1] if len(ranked) > 1 else None

    ambiguous = (
        best is not None
        and second is not None
        and best.score - second.score < AMBIGUITY_MARGIN
        and second.score >= AMBIGUITY_RIVAL_MIN
    )
    if best is None or best.score < MIN_BRAND_SCORE or ambiguous:
        # Fallback: derive the brand from the registrable domain label when it is
        # corroborated in the homepage title/h1/og:site_name (e.g. docs.stripe.com
        # → "Stripe"). Only when the normal candidate model is not confident, so
        # confident resolutions (and the V1 golden) are unaffected.
        domain_brand = _domain_brand_fallback(pages, canonical_domain)
        if domain_brand:
            profile.brand_name = domain_brand
            profile.brand_confidence = 0.55
            profile.needs_confirmation = False
            evidence.append(
                EvidenceItem(
                    field_name="brand_name",
                    value=domain_brand,
                    source_type="domain+title_h1",
                    confidence=0.55,
                )
            )
            return
        profile.brand_name = None
        profile.needs_confirmation = True
        profile.brand_confidence = round(best.score, 4) if best else 0.0
        return

    profile.brand_name = best.name
    profile.brand_confidence = best.score
    profile.needs_confirmation = False
    profile.aliases = [c.name for c in ranked[1:] if c.score >= 0.40]
    evidence.append(
        EvidenceItem(
            field_name="brand_name",
            value=best.name,
            source_type="+".join(best.sources),
            confidence=best.score,
        )
    )


def _domain_brand_fallback(pages: list[ExtractedPage], canonical_domain: str) -> str | None:
    """The cased registrable-domain label if it appears in the homepage identity.

    Requires a single, non-generic domain label (≥3 chars) that occurs as a whole
    word in a homepage og:site_name / title / h1, and returns that cased form.
    """
    dom = _domain_tokens(canonical_domain)
    if len(dom) != 1:
        return None
    label = next(iter(dom))
    if len(label) < 3 or label in _GENERIC_BRAND_TOKENS:
        return None
    for page in pages:
        if page.page_type != "home":
            continue
        for text in (page.open_graph.get("og:site_name"), page.title, page.h1):
            if not text:
                continue
            for word in re.findall(r"[A-Za-z0-9]+", text):
                if word.lower() == label:
                    return word
    return None


def _plausible_offering_name(name: str) -> bool:
    """A real product/service name is a short label, not a sentence. Rejects
    content mis-read as an offering (e.g. a long H1 on a page that merely mentions
    the word 'products')."""
    return 0 < len(name) <= 60 and len(name.split()) <= 8 and ":" not in name


def _resolve_offerings(
    pages: list[ExtractedPage], profile: BusinessProfile, evidence: list[EvidenceItem]
) -> None:
    services: dict[str, tuple[str | None, str]] = {}
    products: dict[str, tuple[str | None, str]] = {}

    def add(bucket: dict, name: str, url: str | None, source: str) -> None:
        name = " ".join(name.split())
        if not _plausible_offering_name(name):
            return
        key = name.lower()
        if key not in bucket:
            bucket[key] = (url, source)

    for page in pages:
        # From JSON-LD Service / Product nodes.
        for node in page.json_ld:
            types = [t.lower() for t in _type_list(node)]
            name = node.get("name")
            if not isinstance(name, str) or not name.strip():
                continue
            if "service" in types:
                add(services, name, page.final_url, "json_ld")
            elif "product" in types:
                add(products, name, page.final_url, "json_ld")

        # From navigation: internal links whose target path classifies as
        # a service/product page.
        for link in page.internal_links:
            if not link.text:
                continue
            link_type = classify_page(link.href, None, {})
            if link_type == "service":
                add(services, link.text, link.href, "navigation")
            elif link_type == "product":
                add(products, link.text, link.href, "navigation")

        # From the page itself when it is a service/product page.
        if page.page_type == "service" and page.h1:
            add(services, page.h1, page.final_url, "heading")
        elif page.page_type == "product" and page.h1:
            add(products, page.h1, page.final_url, "heading")

    _finalize_offering(services, "service", profile, evidence, is_service=True)
    _finalize_offering(products, "product", profile, evidence, is_service=False)


def _finalize_offering(
    bucket: dict[str, tuple[str | None, str]],
    field_name: str,
    profile: BusinessProfile,
    evidence: list[EvidenceItem],
    *,
    is_service: bool,
) -> None:
    names = sorted(bucket)
    if is_service:
        profile.services = names
    else:
        profile.products = names
    for key in names:
        url, source = bucket[key]
        conf = 0.9 if source == "json_ld" else 0.6 if source == "navigation" else 0.5
        evidence.append(
            EvidenceItem(
                field_name=field_name,
                value=key,
                source_url=url,
                source_type=source,
                confidence=conf,
            )
        )


def _profile_hash(profile: BusinessProfile) -> str:
    core = {
        "brand_name": profile.brand_name or "",
        "legal_name": profile.legal_name or "",
        "aliases": sorted(profile.aliases),
        "services": profile.services,
        "products": profile.products,
        "locations": profile.locations,
        "countries": profile.countries,
        "languages": profile.languages,
    }
    serialized = json.dumps(core, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
