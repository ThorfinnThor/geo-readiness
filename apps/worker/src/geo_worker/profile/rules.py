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


def _spaceless(text: str) -> str:
    """Lowercase text with all non-alphanumerics removed ('Select Your Sauna' ->
    'selectyoursauna'), so a spaced brand can be matched to a concatenated domain."""
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def _domain_core_spaceless(canonical_domain: str) -> str:
    """The registrable domain core, concatenated ('selectyoursauna.com' ->
    'selectyoursauna'), for matching against a multi-word brand."""
    labels = canonical_domain.lower().split(".")
    core = labels[:-1] if len(labels) > 1 else labels
    while len(core) > 1 and core[0] in _COMMON_SUBDOMAINS:
        core = core[1:]
    return _spaceless("".join(core))


def _title_affixes(title: str | None) -> list[str]:
    """Both ends of a separated title as brand candidates: the last segment
    ('Page — Brand') and the first ('Brand — Tagline')."""
    if not title:
        return []
    parts = [p.strip() for p in _TITLE_SEPARATORS.split(title) if p.strip()]
    if len(parts) < 2:
        return []
    return list(dict.fromkeys([parts[-1], parts[0]]))


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
    _resolve_geography(org_nodes, pages, profile, evidence)
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


# German imprint (§ 5 DDG/TMG) parsing: high-precision markers that name the
# operator, plus a postal-code + city pattern. visible_text is flattened to spaces,
# so these run over a single string. Gated to legal/about pages only.
_LEGAL_TEXT_PAGE_TYPES = {"legal", "about"}
_LEGAL_NAME_RE = [
    # Company with an explicit legal form ("Foo Bar GmbH").
    re.compile(
        r"([A-ZÄÖÜ][\wäöüß.&'\-]*(?:\s+[A-ZÄÖÜ0-9][\wäöüß.&'\-]*){0,4}\s"
        r"(?:GmbH(?:\s?&\s?Co\.?\s?KG)?|UG(?:\s?\(haftungsbeschränkt\))?|AG|"
        r"e\.?\s?K\.?|e\.?\s?V\.?|GbR|mbH|KG|OHG|Ltd\.?|LLC|Inc\.?))"
    ),
    # Operator markers ("Betreiber … ist [das Einzelunternehmen] X").
    re.compile(
        r"[Bb]etreiber(?:\s+dieser\s+[Ww]ebsite)?\s+ist\s+"
        r"(?:das\s+[Ee]inzelunternehmen\s+|die\s+[Ff]irma\s+)?"
        r"([A-ZÄÖÜ][\wäöüß.&'\-]+(?:\s+[A-ZÄÖÜ0-9][\wäöüß.&'\-]+){0,3})"
    ),
    re.compile(
        r"(?:Diensteanbieter|Anbieter|Herausgeber)\s*:?\s+"
        r"([A-ZÄÖÜ][\wäöüß.&'\-]+(?:\s+[A-ZÄÖÜ0-9][\wäöüß.&'\-]+){0,3})"
    ),
    re.compile(r"Inhaber(?:in)?\s*:?\s+([A-ZÄÖÜ][\wäöüß.\-]+(?:\s+[A-ZÄÖÜ][\wäöüß.\-]+){0,1})"),
]
_POSTAL_CITY_RE = re.compile(
    r"\b\d{5}\s+([A-ZÄÖÜ][A-Za-zäöüß.\-]+(?:\s[A-ZÄÖÜ][A-Za-zäöüß.\-]+){0,2})"
)
# A postal-code + city capture over flattened imprint text can pull in the
# country line and the next nav/heading word ("… 10117 Berlin Germany Contact").
# These trailing tokens are trimmed so the city is just the city ("Berlin").
_CITY_TRAILING_STOPWORDS = frozenset(
    {
        # nav / headings (en + de)
        "contact",
        "kontakt",
        "about",
        "impressum",
        "imprint",
        "datenschutz",
        "privacy",
        "home",
        "startseite",
        "menu",
        "legal",
        "rechtliches",
        "terms",
        "agb",
        "sitemap",
        "search",
        "login",
        "anmelden",
        "uns",
        # country names that follow a city in a flattened address
        "germany",
        "deutschland",
        "austria",
        "österreich",
        "oesterreich",
        "switzerland",
        "schweiz",
        "france",
        "frankreich",
        "italy",
        "italien",
        "spain",
        "spanien",
        "netherlands",
        "niederlande",
        "belgium",
        "belgien",
        "usa",
        "us",
        "uk",
        "united",
        "kingdom",
        "states",
        "america",
        "europe",
    }
)


def _clean_city(raw: str) -> str:
    """Trim trailing country/nav tokens leaked into a postal-code city capture."""
    words = raw.split()
    while len(words) > 1 and words[-1].lower().strip(".,:-") in _CITY_TRAILING_STOPWORDS:
        words.pop()
    return " ".join(words).strip(" .,-")


# Heading/marker words that leak into a captured name and must be trimmed.
_LEGAL_STOPWORDS = frozenset(
    {
        "impressum",
        "kontakt",
        "angaben",
        "datenschutz",
        "rechtliches",
        "betreiber",
        "anbieter",
        "diensteanbieter",
        "herausgeber",
        "inhaber",
        "die",
        "der",
        "das",
    }
)


def _clean_legal_name(raw: str) -> str:
    words = raw.split()
    while words and words[0].lower().strip(".,:") in _LEGAL_STOPWORDS:
        words = words[1:]
    # Stop at the first word that closes a sentence (a period), so a trailing
    # sentence continuation ("SeitenHafen361. Die Website") is not absorbed.
    out: list[str] = []
    for w in words:
        out.append(w)
        if w.endswith("."):
            break
    return " ".join(out).strip(" .,-")


def _legal_pages(pages: list[ExtractedPage]) -> list[ExtractedPage]:
    return [p for p in pages if p.page_type in _LEGAL_TEXT_PAGE_TYPES and p.visible_text]


def _legal_name_from_text(pages: list[ExtractedPage]) -> tuple[str, str] | None:
    for page in _legal_pages(pages):
        for rx in _LEGAL_NAME_RE:
            m = rx.search(page.visible_text)
            if m:
                name = _clean_legal_name(m.group(1))
                if 2 <= len(name) <= 80:
                    return name, page.final_url
    return None


def _city_from_text(pages: list[ExtractedPage]) -> tuple[str, str] | None:
    for page in _legal_pages(pages):
        m = _POSTAL_CITY_RE.search(page.visible_text)
        if m:
            city = _clean_city(" ".join(m.group(1).split()))
            if 2 <= len(city) <= 40:
                return city, page.final_url
    return None


def _resolve_geography(
    org_nodes: list[tuple[dict, ExtractedPage]],
    pages: list[ExtractedPage],
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

    # Fallback: a German imprint gives the city in postal-code + city form even
    # when there is no address JSON-LD.
    if not locations:
        city = _city_from_text(pages)
        if city:
            locations.setdefault(city[0], city[1])

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

    # Fallback: the operator name from a German imprint (§ 5 DDG/TMG) text.
    found = _legal_name_from_text(pages)
    if found:
        evidence.append(
            EvidenceItem(
                field_name="legal_name",
                value=found[0],
                source_url=found[1],
                source_type="imprint_text",
                confidence=0.7,
            )
        )
        return found[0]
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
    domain_spaceless = _domain_core_spaceless(canonical_domain)
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
        # A multi-word brand whose spaceless form equals the domain ('Select Your
        # Sauna' ~ selectyoursauna) is as strong a domain match as an exact single
        # token — token overlap alone would miss it.
        if domain_spaceless and _spaceless(display[key]) == domain_spaceless:
            sim = 1.0
        else:
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
        # A multi-word identity whose spaceless form equals the domain label
        # ('Select Your Sauna' ~ selectyoursauna): return the cased, spaced form.
        for text in (page.open_graph.get("og:site_name"), *_title_affixes(page.title), page.h1):
            if not text:
                continue
            cleaned = " ".join(text.split())
            if _spaceless(cleaned) == label and not (_tokens(cleaned) <= _GENERIC_BRAND_TOKENS):
                return cleaned
    return None


# Navigation/UI fragments that get mis-read as offering names (a "Products" menu
# item, a "view dataset" link, a comparison teaser). Never real product names.
_OFFERING_STOPWORDS = frozenset(
    {
        "produkt",
        "produkte",
        "product",
        "products",
        "details",
        "mehr",
        "mehr erfahren",
        "ansehen",
        "datensatz ansehen",
        "im vergleich",
        "vergleich",
        "alle produkte",
        "alle ansehen",
    }
)


def _plausible_offering_name(name: str) -> bool:
    """A real product/service name is a short label, not a sentence or a UI string.

    Rejects content mis-read as an offering: long H1s on pages that merely mention
    the word 'products', navigation labels ('Produkte', 'Details'), link teasers
    with UI glyphs ('Datensatz ansehen ↗'), and sentence-like fragments."""
    n = name.strip()
    low = n.lower()
    if not (0 < len(n) <= 60) or len(n.split()) > 8 or ":" in n:
        return False
    if low in _OFFERING_STOPWORDS:
        return False
    # UI glyphs (arrows/chevrons) mark a link/teaser, not a product name.
    if any(ch in n for ch in "↗↘→›»↦"):
        return False
    # Sentence-like fragments (end in a period) are prose, not a label.
    if n.endswith("."):
        return False
    # Must contain at least one letter (reject pure counters/glyphs).
    return re.search(r"[a-zäöüß]", low) is not None


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
