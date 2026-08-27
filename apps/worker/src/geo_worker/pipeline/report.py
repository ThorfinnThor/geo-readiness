"""Assemble the report JSON contract (Free Preview + Full Report)."""

from __future__ import annotations

from pydantic import BaseModel

from geo_worker.methodology.v2.stages import STAGE_EXPLANATIONS

from .runner import ScanResult

_COMPONENT_NAMES: dict[str, str] = {
    "entity_clarity": "Entity Clarity",
    "offer_clarity": "Offer Clarity",
    "prompt_coverage": "Prompt Coverage",
    "sourceability": "Sourceability",
    "structured_data": "Structured Data",
    "evidence_trust": "Evidence & Trust",
    "technical_access": "Technical Accessibility",
}

_STAGE_NAMES: dict[str, str] = {
    "retrieval_readiness": "Retrieval Readiness",
    "citation_readiness": "Citation Readiness",
    "answer_extractability": "Answer Extractability",
}

_SIGNAL_LABELS: dict[str, str] = {
    "quantified_information": "specific quantified information",
    "evidence_attribution": "source attribution",
    "semantic_extractability": "extractable structure",
    "direct_answerability": "direct answers",
    "declared_freshness": "freshness signals",
    "author_responsibility": "clear authorship",
    "first_party_evidence_depth": "first-party evidence depth",
    "definition_comparison_procedure": "definitions/comparisons/procedures",
    "stable_topic_identity": "stable topic identity",
}

# §94 — the honest, provider-neutral disclaimer.
DISCLAIMER = (
    "This audit measures deterministic website readiness for retrieval, citation "
    "and answer extraction using research-supported and heuristic proxies. It does "
    "not measure or guarantee rankings, citations, traffic or visibility in "
    "ChatGPT, Gemini, Perplexity or other AI platforms."
)


def score_level(score: float) -> str:
    if score >= 90:
        return "Excellent"
    if score >= 80:
        return "Strong"
    if score >= 65:
        return "Good"
    if score >= 50:
        return "Needs improvement"
    return "Weak"


def confidence_band(score: float) -> str:
    if score >= 85:
        return "High"
    if score >= 70:
        return "Moderate"
    return "Low"


class ReportComponent(BaseModel):
    key: str
    name: str
    score: float
    level: str  # "N/A" when not applicable
    applicable: bool = True


class ReportRequirement(BaseModel):
    name: str
    weight: int
    strength: float


class ReportCluster(BaseModel):
    cluster_key: str
    intent: str
    label: str
    priority: float
    coverage_score: float
    sample_prompt: str | None = None
    requirements: list[ReportRequirement] = []
    missing_requirements: list[str] = []


class ReportAction(BaseModel):
    rule_id: str
    title: str
    category: str
    severity: str
    priority_score: float
    problem: str
    recommendation: str
    expected_signal: str
    how_to_verify: str
    evidence: list[str]
    # V2 additive: a paste-ready prompt the user can hand to an AI/developer to
    # implement this one fix. Empty for V1.
    fix_prompt: str = ""


class ReportProfile(BaseModel):
    brand_name: str | None
    needs_confirmation: bool
    legal_name: str | None
    services: list[str]
    products: list[str]
    locations: list[str]
    countries: list[str]
    languages: list[str]
    # V2 additive: detected site archetype (§v2-plan 6). Empty for V1.
    site_type: str = ""


class ReportMeta(BaseModel):
    canonical_domain: str
    scan_type: str
    methodology_version: str
    pages_analyzed: int
    clusters_evaluated: int
    confidence_score: float
    confidence_band: str
    # V2 additive (§89); V1 leaves these null.
    methodology_hash: str | None = None
    as_of: str | None = None


class ReportStage(BaseModel):
    key: str
    name: str
    score: float
    level: str
    explanation: str


class ReportDiagnostic(BaseModel):
    component: str
    strongest_signals: list[str] = []
    limiting_signals: list[str] = []
    explanation: str = ""


class ReportLanguageCoverage(BaseModel):
    """Per-language prompt coverage on multilingual sites (§v2-plan 7.4)."""

    language: str
    pages: int
    prompt_coverage_score: float


class ReportCrawl(BaseModel):
    """Crawl transparency (§v2-plan 5.1): what was actually fetched."""

    status: str
    pages_analyzed: int
    pages_fetched: int
    errors: int
    robots_skipped: int
    homepage_reachable: bool
    robots_blocked_core: bool
    valid_response_ratio: float


class ReportDocument(BaseModel):
    meta: ReportMeta
    overall_score: float
    overall_level: str
    components: list[ReportComponent]
    strengths: list[str]
    gaps: list[str]
    business_profile: ReportProfile
    actions: list[ReportAction]
    clusters: list[ReportCluster]
    disclaimer: str = DISCLAIMER
    # V2 additive (§90–92); empty for V1.
    stages: list[ReportStage] = []
    diagnostics: list[ReportDiagnostic] = []
    # V2 additive: one prompt that bundles every fix, paste-ready. Empty for V1.
    fix_prompt_master: str = ""
    # V2 additive transparency: crawl summary, a provisional flag when crawl
    # coverage is too thin to fully trust the score, and an explained empty-cluster
    # state. All null/empty for V1.
    crawl: ReportCrawl | None = None
    provisional: bool = False
    cluster_note: str = ""
    language_coverage: list[ReportLanguageCoverage] = []


def _build_stages(r) -> list[ReportStage]:
    scores = {
        "retrieval_readiness": r.retrieval_readiness_score,
        "citation_readiness": r.citation_readiness_score,
        "answer_extractability": r.answer_extractability_score,
    }
    stages: list[ReportStage] = []
    for key, name in _STAGE_NAMES.items():
        value = scores[key]
        if value is None:
            continue
        stages.append(
            ReportStage(
                key=key,
                name=name,
                score=value,
                level=score_level(value),
                explanation=STAGE_EXPLANATIONS[key],
            )
        )
    return stages


def _build_diagnostics(r) -> list[ReportDiagnostic]:
    out: list[ReportDiagnostic] = []
    for d in r.component_diagnostics:
        limiting = ", ".join(_SIGNAL_LABELS.get(s, s) for s in d.limiting_signals)
        explanation = (
            f"{d.component.replace('_', ' ').title()} is primarily limited by {limiting}."
            if limiting
            else ""
        )
        out.append(
            ReportDiagnostic(
                component=d.component,
                strongest_signals=d.strongest_signals,
                limiting_signals=d.limiting_signals,
                explanation=explanation,
            )
        )
    return out


_FIX_GUARDRAIL = (
    "Only use facts that are genuinely true of this business. Never invent claims, numbers, "
    "reviews, prices, dates or credentials, and never add markup that is not backed by visible "
    "content. Prefer the smallest change that resolves the issue. Do not keyword-stuff, do not "
    "add empty tables or FAQs, and do not fake freshness dates."
)

# Per-category playbooks: concrete, paste-oriented guidance so a coding agent knows
# exactly which files/markup to produce. __BRAND__/__DOMAIN__ are filled with the
# audited site's real values (or a clearly-labelled placeholder). These are additive
# to the action's own recommendation — never a substitute for the site's real facts.
_CATEGORY_PLAYBOOK: dict[str, str] = {
    "entity": (
        "Use one consistent business name in the <title> and a single <h1> on the homepage. "
        "Make sure an About page and a Contact or imprint page exist and are linked in the main "
        "navigation. Confirm identity with Organization JSON-LD in the homepage <head>:\n"
        '<script type="application/ld+json">\n'
        '{"@context":"https://schema.org","@type":"Organization","name":"__BRAND__",'
        '"url":"https://__DOMAIN__","logo":"https://__DOMAIN__/logo.png",'
        '"sameAs":["https://www.linkedin.com/company/…"]}\n'
        "</script>\n"
        "Only include sameAs profiles that genuinely belong to this business."
    ),
    "offer": (
        "Give each core product, service or tool its own page with a descriptive <title> and "
        "<h1>, and state plainly: what it is, who it is for, the problem it solves, key "
        "attributes, the relevant location, and pricing where you publish it. Back each page "
        "with matching JSON-LD — Service or Product for what you sell, or SoftwareApplication "
        "for an online tool — for example:\n"
        '<script type="application/ld+json">\n'
        '{"@context":"https://schema.org","@type":"Service","name":"…",'
        '"provider":{"@type":"Organization","name":"__BRAND__"},"areaServed":"…"}\n'
        "</script>"
    ),
    "coverage": (
        "Pick the single strongest existing page for this question and make it address the "
        "intent directly in the <title>, <h1> and opening section — the service or product, the "
        "audience, the location and the use case — in natural language. Do not spin up thin new "
        "pages or repeat the query verbatim; one page that genuinely answers the need beats many "
        "that echo keywords."
    ),
    "sourceability": (
        "Add the specific, first-party detail an answer engine can quote: real figures "
        "(specs, measurements, outcomes) in context, claims attributed to a named/linked source, "
        "and content laid out as genuine tables, ordered steps or definition lists where the "
        "information calls for it. Put a concise, direct answer near the top of the pages that "
        "target a clear question. Every number and source must be real."
    ),
    "structured_data": (
        "Add valid JSON-LD that mirrors what is visible on the page — Organization (name, url, "
        "logo, contactPoint) plus the type that fits each page (Service/Product for offerings, "
        "Article/BlogPosting for editorial, Dataset for data). Put it on the relevant pages, not "
        "only the homepage, and validate with Google's Rich Results Test. Never add schema whose "
        "facts do not appear in the page's visible content."
    ),
    "trust": (
        "Add the accountability pages you likely already have the content for: About, Contact or "
        "imprint, a privacy/policy page, and references or case studies where they genuinely "
        "apply. Link them from the main navigation and the footer. These must be real pages with "
        "real information, not placeholders."
    ),
    "technical": (
        "Make sure the core content is present in the server-rendered HTML (not JS-only), give "
        "each page one clear topic with a descriptive <title>/<h1>, set a canonical URL, and "
        "consolidate or differentiate near-duplicate pages so each has a distinct purpose."
    ),
    "local": (
        "State the business name, full address and phone consistently across the site, add a "
        "LocalBusiness JSON-LD block with those exact values, and give each served location a "
        "page that names the location and the services offered there."
    ),
}


def _placeholders(profile) -> tuple[str, str, str]:
    """(brand_for_prose, brand_for_markup, domain) for playbook substitution."""
    domain = profile.canonical_domain
    brand = profile.brand_name or ""
    return brand, (brand or "Your Business Name"), domain


def _fmt_list(items: list[str]) -> str:
    return ", ".join(items) if items else "not detected by the crawl"


def _business_context(profile) -> list[str]:
    """The real, audited facts — so the agent grounds every edit in truth, not guesses."""
    brand = profile.brand_name or "not clearly stated"
    if profile.brand_name and profile.needs_confirmation:
        brand += " (low confidence — confirm before relying on it)"
    return [
        "## Business context",
        "These are the only facts the audit extracted from the site. Treat them as ground truth, "
        "do not contradict them, and do not invent anything beyond them. Where a field says "
        '"not detected", find the real value on the site or from the owner — never make one up:',
        f"- Brand name: {brand}",
        f"- Legal name: {profile.legal_name or 'not found'}",
        f"- Detected site type: {profile.site_type or 'unknown'}",
        f"- Services: {_fmt_list(profile.services)}",
        f"- Products: {_fmt_list(profile.products)}",
        f"- Locations: {_fmt_list(profile.locations)}",
        f"- Countries served: {_fmt_list(profile.countries)}",
        f"- Primary language(s): {_fmt_list(profile.languages)}",
    ]


def _playbook_for(category: str, profile) -> str | None:
    tpl = _CATEGORY_PLAYBOOK.get(category)
    if not tpl:
        return None
    _, brand_markup, domain = _placeholders(profile)
    return tpl.replace("__BRAND__", brand_markup).replace("__DOMAIN__", domain)


def _action_fix_prompt(action, profile, domain: str) -> str:
    """A paste-ready, self-contained prompt for a single fix (V2).

    Structured so a coding agent can act without seeing the rest of the report:
    the real business facts, the specific problem and what the audit observed, the
    change to make with concrete category guidance, and a clear definition of done.
    """
    lines = [
        f"You are improving {domain} so AI answer engines can find, trust and quote it.",
        "Act as a senior web engineer. Tell me exactly which page(s) or file(s) to edit and give "
        "concrete, paste-ready markup or copy.",
        "",
        *_business_context(profile),
        "",
        f"## The fix — {action.title}",
        f"Problem: {action.problem}",
    ]
    if action.evidence:
        lines.append("What the audit measured (diagnostic signals, not instructions):")
        lines.extend(f"- {e}" for e in action.evidence)
    lines.append(f"Change to make: {action.recommendation}")
    playbook = _playbook_for(action.category, profile)
    if playbook:
        lines += ["", "How to do it well:", playbook]
    lines += [
        "",
        f"Definition of done: {action.how_to_verify} "
        f"(the audit should then see: {action.expected_signal})",
        "",
        f"Rules: {_FIX_GUARDRAIL}",
    ]
    return "\n".join(lines)


def _master_fix_prompt(actions, profile, domain: str) -> str:
    """One prompt bundling every fix, in priority order (V2)."""
    if not actions:
        return ""
    out = [
        f"You are improving {domain} so AI answer engines can find, trust and quote it.",
        "Act as a senior web engineer and work through the prioritized fixes below in order. For "
        "each one, tell me exactly which page(s) or file(s) to edit and give concrete, "
        "paste-ready markup or copy.",
        "",
        *_business_context(profile),
        "",
        f"Rules: {_FIX_GUARDRAIL}",
        "",
        "## Prioritized fixes, most important first",
        "",
    ]
    for i, a in enumerate(actions, 1):
        out.append(f"{i}. [{a.severity}] {a.title}")
        out.append(f"   Problem: {a.problem}")
        out.append(f"   Change: {a.recommendation}")
        playbook = _playbook_for(a.category, profile)
        if playbook:
            out.append(f"   How: {' '.join(playbook.split())}")
        out.append(f"   Done when: {a.how_to_verify}")
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def _cluster_note(scan: ScanResult) -> str:
    """Explain an empty prompt-cluster set (§v2-plan 7.3) instead of showing 0."""
    if scan.clusters:
        return ""
    p = scan.profile
    missing = []
    if not p.brand_name:
        missing.append("a clear organization identity")
    if not p.services and not p.products:
        missing.append("an identifiable offering (services or products)")
    if not (p.industries or p.services or p.products):
        missing.append("a stable topic")
    reason = ", ".join(missing) if missing else "signals of sufficient confidence"
    return (
        "Prompt modeling could not be completed because the crawl did not yield "
        f"{reason}. Clarify these on the site and re-scan."
    )


def build_report(scan: ScanResult) -> ReportDocument:
    r = scan.readiness
    # These are V2 features; V1 reports leave them empty (frozen output).
    is_v2 = scan.methodology_version != "geo-readiness-v1"
    domain = scan.canonical_domain
    valid_ratio = (
        scan.pages_fetched / (scan.pages_fetched + scan.crawl_errors)
        if (scan.pages_fetched + scan.crawl_errors)
        else 1.0
    )
    crawl = (
        ReportCrawl(
            status=scan.crawl_status,
            pages_analyzed=scan.pages_analyzed,
            pages_fetched=scan.pages_fetched,
            errors=scan.crawl_errors,
            robots_skipped=scan.robots_skipped,
            homepage_reachable=scan.homepage_reachable,
            robots_blocked_core=scan.robots_blocked_core,
            valid_response_ratio=round(valid_ratio, 4),
        )
        if is_v2
        else None
    )
    # Provisional when crawl coverage is too thin to fully trust the score.
    provisional = bool(
        is_v2
        and (
            not scan.homepage_reachable
            or scan.robots_blocked_core
            or valid_ratio < 0.8
            or scan.pages_analyzed == 0
        )
    )
    applicable_by_key = {c.name: c.applicable for c in r.components}
    components = [
        ReportComponent(
            key=key,
            name=name,
            score=getattr(r, f"{key}_score"),
            level="N/A"
            if not applicable_by_key.get(key, True)
            else score_level(getattr(r, f"{key}_score")),
            applicable=applicable_by_key.get(key, True),
        )
        for key, name in _COMPONENT_NAMES.items()
    ]

    # Strengths/gaps only consider applicable components (N/A is neither).
    ranked = sorted((c for c in components if c.applicable), key=lambda c: c.score, reverse=True)
    strengths = [f"{c.name} is strong ({c.score:g}/100)" for c in ranked[:3] if c.score >= 65]
    gaps = [f"{c.name} needs work ({c.score:g}/100)" for c in reversed(ranked[-3:]) if c.score < 80]

    cov_by_key = {cc.cluster_key: cc for cc in scan.coverage.clusters}
    clusters: list[ReportCluster] = []
    for cluster in scan.clusters:
        cov = cov_by_key.get(cluster.cluster_key)
        label = cluster.topic or cluster.service or cluster.product or cluster.intent
        clusters.append(
            ReportCluster(
                cluster_key=cluster.cluster_key,
                intent=cluster.intent,
                label=label,
                priority=cluster.priority,
                coverage_score=cov.coverage_score if cov else 0.0,
                sample_prompt=cluster.prompts[0].prompt_text if cluster.prompts else None,
                requirements=[
                    ReportRequirement(name=rq.name, weight=rq.weight, strength=rq.strength)
                    for rq in (cov.requirements if cov else [])
                ],
                missing_requirements=cov.missing_requirements if cov else [],
            )
        )

    actions = [
        ReportAction(
            rule_id=a.rule_id,
            title=a.title,
            category=a.category,
            severity=a.severity,
            priority_score=a.priority_score,
            problem=a.problem,
            recommendation=a.recommendation,
            expected_signal=a.expected_signal,
            how_to_verify=a.how_to_verify,
            evidence=a.evidence,
            fix_prompt=_action_fix_prompt(a, scan.profile, domain) if is_v2 else "",
        )
        for a in scan.actions
    ]

    profile = ReportProfile(
        brand_name=scan.profile.brand_name,
        needs_confirmation=scan.profile.needs_confirmation,
        legal_name=scan.profile.legal_name,
        services=scan.profile.services,
        products=scan.profile.products,
        locations=scan.profile.locations,
        countries=scan.profile.countries,
        languages=scan.profile.languages,
        site_type=scan.profile.site_type if is_v2 else "",
    )

    meta = ReportMeta(
        canonical_domain=scan.canonical_domain,
        scan_type=scan.scan_type,
        methodology_version=scan.methodology_version,
        pages_analyzed=scan.pages_analyzed,
        clusters_evaluated=len(scan.clusters),
        confidence_score=r.confidence_score,
        confidence_band=confidence_band(r.confidence_score),
        methodology_hash=scan.methodology_hash,
        as_of=scan.as_of.isoformat() if scan.as_of else None,
    )

    return ReportDocument(
        meta=meta,
        overall_score=r.overall_score,
        overall_level=score_level(r.overall_score),
        components=components,
        strengths=strengths,
        gaps=gaps,
        business_profile=profile,
        actions=actions,
        clusters=clusters,
        stages=_build_stages(r),
        diagnostics=_build_diagnostics(r),
        fix_prompt_master=_master_fix_prompt(scan.actions, scan.profile, domain) if is_v2 else "",
        crawl=crawl,
        provisional=provisional,
        cluster_note=_cluster_note(scan) if is_v2 else "",
        language_coverage=[
            ReportLanguageCoverage(
                language=lc.language, pages=lc.pages, prompt_coverage_score=lc.prompt_coverage_score
            )
            for lc in scan.coverage.language_coverage
        ],
    )
