"""Deterministic cluster generator (§14).

Priority (§14), computed WITHOUT any readiness/coverage signal:

    0.35 relevance + 0.30 commercial_intent + 0.20 evidence_strength
  + 0.10 diversity_gain + 0.05 local_specificity
"""

from __future__ import annotations

import hashlib
from collections import Counter
from dataclasses import dataclass, field

from geo_worker.profile.types import BusinessProfile
from geo_worker.prompts import load_taxonomy, load_template_set, render_template
from geo_worker.prompts.types import TemplateSet

from .types import GeneratedCluster, GeneratedPrompt

# Explosion guards (§14).
QUICK_MAX_CLUSTERS = 15
FULL_MAX_CLUSTERS = 50
MAX_PROMPTS_PER_CLUSTER = 3

SUPPORTED_LANGUAGES = ("de", "en")

# Structural relevance per intent — how central the intent is to a provider's
# discoverability. Independent of the site's measured evidence quality.
_RELEVANCE_BASE: dict[str, float] = {
    "recommendation": 1.00,
    "local": 0.95,
    "category_discovery": 0.90,
    "best_of": 0.85,
    "comparison": 0.85,
    "pricing": 0.80,
    "product_fit": 0.80,
    "combined_service": 0.80,
    "problem_solution": 0.80,
    "trust": 0.75,
    "alternative": 0.75,
    "integration": 0.60,
    "branded": 0.40,
    # Informational fallback for content sites with no offerings.
    "topic_info": 0.90,
}


@dataclass
class _Spec:
    intent: str
    context: dict[str, str]
    topic: str | None = None
    service: str | None = None
    product: str | None = None
    location: str | None = None
    audience: str | None = None
    evidence_keys: list[tuple[str, str]] = field(default_factory=list)


def _norm(value: str | None) -> str:
    return (value or "").strip().lower()


def _pick_language(profile: BusinessProfile, override: str | None) -> str:
    # Prefer the dominant content language so questions are in the language the
    # site is actually in (a mostly-English site should not get German questions).
    lang = (
        override
        or (profile.primary_language if profile.primary_language in SUPPORTED_LANGUAGES else None)
        or next((lg for lg in profile.languages if lg in SUPPORTED_LANGUAGES), "en")
    )
    return lang if lang in SUPPORTED_LANGUAGES else "en"


def _cluster_key(methodology_version: str, spec: _Spec, locale: str) -> str:
    parts = [
        methodology_version,
        spec.intent,
        _norm(spec.topic),
        _norm(spec.service),
        _norm(spec.product),
        _norm(spec.location),
        _norm(spec.audience),
        locale,
    ]
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()


def _evidence_lookup(profile: BusinessProfile) -> dict[tuple[str, str], float]:
    out: dict[tuple[str, str], float] = {}
    for item in profile.evidence:
        key = (item.field_name, item.value.lower())
        out[key] = max(out.get(key, 0.0), item.confidence)
    return out


def _candidate_specs(profile: BusinessProfile) -> list[_Spec]:
    specs: list[_Spec] = []
    services = profile.services
    products = profile.products
    locations = profile.locations
    audiences = profile.target_audiences
    primary = (
        profile.industries[:1]
        or services[:1]
        or ([profile.brand_name] if profile.brand_name else [])
    )
    primary_topic = primary[0] if primary else None

    for s in services:
        ev = [("service", s.lower())]
        specs.append(
            _Spec("category_discovery", {"service": s}, topic=s, service=s, evidence_keys=ev)
        )
        specs.append(_Spec("recommendation", {"service": s}, service=s, evidence_keys=ev))
        for loc in locations:
            specs.append(
                _Spec(
                    "local",
                    {"service": s, "location": loc},
                    service=s,
                    location=loc,
                    evidence_keys=ev + [("location", loc.lower())],
                )
            )
        for aud in audiences:
            specs.append(
                _Spec(
                    "product_fit",
                    {"service": s, "audience": aud},
                    service=s,
                    audience=aud,
                    evidence_keys=ev,
                )
            )

    for p in products:
        ev = [("product", p.lower())]
        specs.append(_Spec("comparison", {"product_category": p}, product=p, evidence_keys=ev))
        specs.append(_Spec("alternative", {"product": p}, product=p, evidence_keys=ev))
        specs.append(_Spec("pricing", {"service": p}, product=p, evidence_keys=ev))

    if len(services) >= 2:
        a, b = services[0], services[1]
        specs.append(
            _Spec(
                "combined_service",
                {"service_a": a, "service_b": b},
                service=a,
                product=b,
                evidence_keys=[("service", a.lower()), ("service", b.lower())],
            )
        )

    if primary_topic:
        ev = [("service", primary_topic.lower())]
        specs.append(
            _Spec("trust", {"service": primary_topic}, service=primary_topic, evidence_keys=ev)
        )
        specs.append(
            _Spec("best_of", {"service": primary_topic}, service=primary_topic, evidence_keys=ev)
        )

    if profile.brand_name:
        specs.append(
            _Spec(
                "branded",
                {"brand": profile.brand_name},
                topic=profile.brand_name,
                evidence_keys=[("brand_name", profile.brand_name.lower())],
            )
        )

    # Informational fallback: content sites with no offerings get topic questions
    # about what the site actually covers, instead of only brand-name clusters.
    for t in profile.topics:
        specs.append(
            _Spec("topic_info", {"topic": t}, topic=t, evidence_keys=[("topic", t.lower())])
        )

    return specs


# Offering names are stored lowercased for stable dedup/keys/hash, which reads
# oddly when an acronym or a leading article slips into a question ("premium ai
# readiness audit", "Which the ai search ... should be compared?"). These fixes
# are presentation-only: applied to the rendered prompt text, never to the
# cluster key, the profile or the hash, so scoring stays byte-identical.
_OFFERING_SLOTS = frozenset(
    {"service", "service_a", "service_b", "product", "product_category", "topic"}
)
_OFFERING_ARTICLES = ("the ", "a ", "an ")
_OFFERING_ACRONYMS = {
    "ai": "AI",
    "seo": "SEO",
    "geo": "GEO",
    "api": "API",
    "saas": "SaaS",
    "b2b": "B2B",
    "b2c": "B2C",
    "crm": "CRM",
    "erp": "ERP",
    "hr": "HR",
    "it": "IT",
    "ux": "UX",
    "ui": "UI",
    "kpi": "KPI",
    "roi": "ROI",
    "llm": "LLM",
    "iot": "IoT",
    "pdf": "PDF",
    "saas.": "SaaS",
}


def _humanize_offering(value: str) -> str:
    """Strip a leading article and restore known acronym casing for display."""
    v = value.strip()
    low = v.lower()
    for art in _OFFERING_ARTICLES:
        if low.startswith(art):
            v = v[len(art) :].strip()
            break
    return " ".join(_OFFERING_ACRONYMS.get(tok.lower(), tok) for tok in v.split())


def _display_context(context: dict[str, str]) -> dict[str, str]:
    return {k: (_humanize_offering(v) if k in _OFFERING_SLOTS else v) for k, v in context.items()}


def _render_prompts(
    spec: _Spec, cluster_key: str, template_set: TemplateSet
) -> list[GeneratedPrompt]:
    prompts: list[GeneratedPrompt] = []
    display_context = _display_context(spec.context)
    for template in template_set.templates.get(spec.intent, []):
        if len(prompts) >= MAX_PROMPTS_PER_CLUSTER:
            break
        text = render_template(template.text, display_context)
        if text is None:
            continue
        prompt_key = hashlib.sha256(f"{cluster_key}|{template.id}".encode()).hexdigest()[:32]
        prompts.append(
            GeneratedPrompt(
                prompt_key=prompt_key,
                prompt_text=text,
                variant_index=len(prompts),
                template_id=template.id,
            )
        )
    return prompts


def generate_clusters(
    profile: BusinessProfile,
    methodology_version: str,
    scan_type: str = "quick",
    language: str | None = None,
    prompt_version: str = "v1",
) -> list[GeneratedCluster]:
    """Generate deterministic, capped, prompt-bearing clusters from a profile."""
    locale = _pick_language(profile, language)
    taxonomy = load_taxonomy(prompt_version)
    template_set = load_template_set(locale, prompt_version)
    evidence = _evidence_lookup(profile)
    max_clusters = FULL_MAX_CLUSTERS if scan_type == "full" else QUICK_MAX_CLUSTERS

    built: dict[str, GeneratedCluster] = {}
    for spec in _candidate_specs(profile):
        intent = taxonomy.by_key(spec.intent)
        if intent is None:
            continue
        key = _cluster_key(methodology_version, spec, locale)
        if key in built:
            continue
        prompts = _render_prompts(spec, key, template_set)
        if not prompts:
            continue  # nothing renderable → no evidence need to represent

        evidence_strength = (
            max((evidence.get(ek, 0.0) for ek in spec.evidence_keys), default=0.0) or 0.5
        )
        relevance = _RELEVANCE_BASE.get(spec.intent, 0.5)
        local_specificity = 1.0 if spec.location else 0.0
        base = (
            0.35 * relevance
            + 0.30 * intent.commercial_intent
            + 0.20 * evidence_strength
            + 0.05 * local_specificity
        )
        built[key] = GeneratedCluster(
            cluster_key=key,
            intent=spec.intent,
            topic=spec.topic,
            service=spec.service,
            product=spec.product,
            location=spec.location,
            audience=spec.audience,
            language=locale,
            commercial_intent=intent.commercial_intent,
            relevance=round(relevance, 4),
            priority=round(base, 4),  # diversity added below
            weight=0.0,
            template_version=template_set.version,
            prompts=prompts,
        )

    # Diversity gain: earlier clusters of an already-represented intent get less.
    ordered = sorted(built.values(), key=lambda c: (-c.priority, c.cluster_key))
    seen: Counter[str] = Counter()
    for cluster in ordered:
        diversity = 1.0 / (1 + seen[cluster.intent])
        cluster.priority = round(cluster.priority + 0.10 * diversity, 4)
        cluster.weight = cluster.priority
        seen[cluster.intent] += 1

    ranked = sorted(built.values(), key=lambda c: (-c.priority, c.cluster_key))
    return ranked[:max_clusters]
