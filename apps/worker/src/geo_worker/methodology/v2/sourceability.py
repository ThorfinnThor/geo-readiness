"""Sourceability V2 (§51–60): nine research-informed, signal-based subscores.

Replaces every V1 weak proxy (any-digit, FAQ-page existence, original-first-party
label). Uses the additive PageSignals from Phases 3–5. Applicability-aware: some
signals are N/A on some sites and are excluded from the denominator (§67).
"""

from __future__ import annotations

import datetime as dt

from geo_worker.extraction.types import ExtractedPage
from geo_worker.scoring.types import (
    ComponentDiagnostic,
    ComponentScore,
    SignalAssessment,
    SignalStatus,
    SubScore,
)

_CONTENT_TYPES = {"service", "product", "pricing", "guide", "case_study", "home", "about"}
_FRESHNESS_TYPES = {"pricing", "product", "blog", "guide", "case_study"}
_AUTHOR_TYPES = {"blog", "guide", "case_study", "reference"}
_MIN_WORDS = 30

# (key, weight); weights sum to 100 (§51).
_WEIGHTS: list[tuple[str, int]] = [
    ("quantified_information", 18),
    ("evidence_attribution", 15),
    ("semantic_extractability", 15),
    ("direct_answerability", 12),
    ("declared_freshness", 10),
    ("author_responsibility", 8),
    ("first_party_evidence_depth", 10),
    ("definition_comparison_procedure", 7),
    ("stable_topic_identity", 5),
]


def _saturate(total: int, steps: list[tuple[int, float]]) -> float:
    strength = 0.0
    for threshold, value in steps:
        if total >= threshold:
            strength = value
    return strength


def _density_strength(pages: list[ExtractedPage]) -> float:
    best = 0.0
    for p in pages:
        if p.page_type not in _CONTENT_TYPES or p.signals.main_word_count < _MIN_WORDS:
            continue
        density = p.signals.quantified_information_count / (p.signals.main_word_count / 1000)
        best = max(best, _saturate(int(density), [(1, 0.25), (3, 0.5), (6, 0.75), (11, 1.0)]))
    return best


def _freshness(pages: list[ExtractedPage], as_of: dt.datetime) -> tuple[SignalStatus, float | None]:
    applicable = [p for p in pages if p.page_type in _FRESHNESS_TYPES]
    if not applicable:
        return SignalStatus.not_applicable, None
    best = 0.0
    for p in applicable:
        if p.signals.invalid_future_date:
            continue
        date = p.signals.date_modified or p.signals.date_published
        if date is None:
            continue
        age = (as_of.date() - date).days
        best = max(best, 1.0 if age <= 180 else 0.8 if age <= 365 else 0.5 if age <= 730 else 0.25)
    return SignalStatus.observed if best > 0 else SignalStatus.missing, best


def _author(pages: list[ExtractedPage]) -> tuple[SignalStatus, float | None]:
    applicable = [p for p in pages if p.page_type in _AUTHOR_TYPES]
    if not applicable:
        return SignalStatus.not_applicable, None
    have = sum(
        1 for p in applicable if p.signals.author_names or p.signals.organization_author_present
    )
    strength = have / len(applicable)
    return (SignalStatus.observed if strength > 0 else SignalStatus.missing), strength


def _assess(pages: list[ExtractedPage], as_of: dt.datetime) -> list[SignalAssessment]:
    any_data_table = any(p.signals.data_table_count > 0 for p in pages)
    any_procedure = any(p.signals.procedural_step_count > 0 for p in pages)
    any_definition = any(p.signals.definition_structure_count > 0 for p in pages)
    any_comparison = any(p.signals.comparison_structure_count > 0 for p in pages)
    any_list = any(
        (p.signals.ordered_list_count + p.signals.unordered_list_count) > 0 for p in pages
    )
    core_structs = sum((any_data_table, any_procedure, any_definition, any_comparison))
    types = {p.page_type for p in pages}

    citations = sum(
        p.signals.external_citation_count + p.signals.attributed_quote_count for p in pages
    )
    answers = sum(p.signals.faq_answer_count for p in pages)
    quantified = _density_strength(pages)

    fresh_status, fresh_strength = _freshness(pages, as_of)
    author_status, author_strength = _author(pages)

    fpe = min(
        1.0,
        (0.4 if types & {"case_study", "reference"} else 0.0)
        + (0.3 if quantified > 0 else 0.0)
        + (0.3 if (any_procedure or any_definition) else 0.0),
    )
    dcp = min(1.0, sum((any_definition, any_comparison, any_procedure)) / 3)
    stable = (
        sum(1 for p in pages if p.title and p.h1 and p.page_type != "other") / len(pages)
        if pages
        else 0.0
    )

    def observed(strength: float) -> SignalStatus:
        return SignalStatus.observed if strength > 0 else SignalStatus.missing

    values: dict[str, tuple[SignalStatus, float | None]] = {
        "quantified_information": (observed(quantified), quantified),
        "evidence_attribution": (
            observed(_saturate(citations, [(1, 0.4), (2, 0.7), (4, 1.0)])),
            _saturate(citations, [(1, 0.4), (2, 0.7), (4, 1.0)]),
        ),
        "semantic_extractability": (
            observed(min(1.0, core_structs / 3) or (0.2 if any_list else 0.0)),
            min(1.0, core_structs / 3) if core_structs else (0.2 if any_list else 0.0),
        ),
        "direct_answerability": (
            observed(_saturate(answers, [(1, 0.5), (3, 0.8), (6, 1.0)])),
            _saturate(answers, [(1, 0.5), (3, 0.8), (6, 1.0)]),
        ),
        "declared_freshness": (fresh_status, fresh_strength),
        "author_responsibility": (author_status, author_strength),
        "first_party_evidence_depth": (observed(fpe), fpe),
        "definition_comparison_procedure": (observed(dcp), dcp),
        "stable_topic_identity": (observed(stable), stable),
    }

    return [
        SignalAssessment(key=key, status=values[key][0], weight=weight, strength=values[key][1])
        for key, weight in _WEIGHTS
    ]


def sourceability_component(
    pages: list[ExtractedPage], as_of: dt.datetime
) -> tuple[ComponentScore, ComponentDiagnostic]:
    assessments = _assess(pages, as_of)

    applicable_weight = 0
    earned = 0.0
    subscores: list[SubScore] = []
    for a in assessments:
        if a.status is SignalStatus.not_applicable or a.strength is None:
            continue
        applicable_weight += a.weight
        earned += a.weight * a.strength
        subscores.append(
            SubScore(
                name=a.key,
                weight=a.weight,
                strength=round(a.strength, 4),
                points=round(a.weight * a.strength, 4),
            )
        )
    score = round(100 * earned / applicable_weight, 2) if applicable_weight else 0.0

    ranked = sorted(
        (a for a in assessments if a.strength is not None), key=lambda a: a.strength or 0
    )
    diagnostic = ComponentDiagnostic(
        component="sourceability",
        limiting_signals=[a.key for a in ranked[:2] if (a.strength or 0) < 0.5],
        strongest_signals=[a.key for a in reversed(ranked[-2:]) if (a.strength or 0) >= 0.5],
        assessed_weight_ratio=round(applicable_weight / 100, 4),
    )
    return ComponentScore(name="sourceability", score=score, subscores=subscores), diagnostic
