"""Deterministic topical alignment (§41–47).

No embeddings, no LLM, no external corpus. Alignment blends concept coverage,
field prominence (title/H1 > headings > body), IDF-weighted prompt overlap, and
concept co-location. It saturates by construction — presence, not frequency —
so keyword stuffing cannot outrank a naturally written page.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from geo_worker.clusters.types import GeneratedCluster
from geo_worker.extraction.types import ExtractedPage

from .tokenize import token_set, tokenize
from .types import TopicalAlignmentResult

# Concept fields on a cluster, in a stable order.
_CONCEPT_FIELDS = ("service", "product", "topic", "location", "audience")


@dataclass(frozen=True)
class _PageIndex:
    url: str
    title: frozenset[str]
    h1: frozenset[str]
    headings: frozenset[str]
    main: frozenset[str]

    def field_weight(self, token: str) -> float:
        if token in self.title or token in self.h1:
            return 1.0
        if token in self.headings:
            return 0.8
        if token in self.main:
            return 0.5
        return 0.0

    def concept_strength(self, concept: frozenset[str]) -> float:
        if not concept:
            return 0.0
        if concept <= self.title or concept <= self.h1:
            return 1.0
        if concept <= self.headings:
            return 0.8
        if concept <= self.main:
            return 0.5
        return 0.0


class TopicalAlignmentEngine:
    def __init__(self, pages: list[ExtractedPage]) -> None:
        self._pages = [self._index(p) for p in pages]
        self._n = len(self._pages)
        df: dict[str, int] = {}
        for idx in self._pages:
            for token in idx.main:
                df[token] = df.get(token, 0) + 1
        self._df = df

    @staticmethod
    def _index(page: ExtractedPage) -> _PageIndex:
        heads: set[str] = set()
        for tag in ("h2", "h3"):
            for text in page.headings.get(tag, []):
                heads |= token_set(text)
        main = page.signals.main_text or page.visible_text
        return _PageIndex(
            url=page.final_url,
            title=token_set(page.title or ""),
            h1=token_set(page.h1 or ""),
            headings=frozenset(heads),
            main=token_set(main),
        )

    def _idf(self, token: str) -> float:
        return math.log((self._n + 1) / (self._df.get(token, 0) + 1)) + 1.0

    def _prompt_alignment(self, prompt_tokens: list[str], idx: _PageIndex) -> float:
        if not prompt_tokens:
            return 0.0
        num = 0.0
        den = 0.0
        for token in set(prompt_tokens):
            weight = self._idf(token)
            den += weight
            num += weight * idx.field_weight(token)
        return num / den if den else 0.0

    def score_cluster(self, cluster: GeneratedCluster) -> TopicalAlignmentResult:
        concepts: list[tuple[str, frozenset[str]]] = []
        for field in _CONCEPT_FIELDS:
            value = getattr(cluster, field, None)
            if value:
                concepts.append((str(value), token_set(str(value))))

        prompt_tokens: list[str] = []
        for prompt in cluster.prompts:
            prompt_tokens.extend(tokenize(prompt.prompt_text, drop_stopwords=True))

        best_score = 0.0
        best_url: str | None = None
        best_present: set[str] = set()
        page_scores: list[float] = []

        for idx in self._pages:
            score01, present = self._page_score(concepts, prompt_tokens, idx)
            page_scores.append(score01)
            if score01 > best_score:
                best_score, best_url, best_present = score01, idx.url, present

        if page_scores:
            top3 = sorted(page_scores, reverse=True)[:3]
            site01 = 0.8 * max(page_scores) + 0.2 * (sum(top3) / len(top3))
        else:
            site01 = 0.0

        missing = [label for label, _ in concepts if label not in best_present]
        return TopicalAlignmentResult(
            cluster_key=cluster.cluster_key,
            score=round(site01 * 100, 2),
            best_supporting_url=best_url,
            best_page_score=round(best_score * 100, 2),
            concept_coverage=round(len(best_present) / len(concepts), 4) if concepts else 0.0,
            missing_concepts=missing,
            evidence=[f"best page: {best_url}"] if best_url else [],
        )

    def _page_score(
        self,
        concepts: list[tuple[str, frozenset[str]]],
        prompt_tokens: list[str],
        idx: _PageIndex,
    ) -> tuple[float, set[str]]:
        present: set[str] = set()
        strengths: list[float] = []
        for label, tokens in concepts:
            strength = idx.concept_strength(tokens)
            strengths.append(strength)
            if strength > 0:
                present.add(label)

        total = len(concepts)
        coverage = (len(present) / total) if total else 0.0
        prominence = (sum(strengths) / total) if total else 0.0
        prompt_align = self._prompt_alignment(prompt_tokens, idx)

        if total <= 1:
            colocation = 1.0 if present else 0.0
        elif len(present) >= 2:
            colocation = 1.0
        elif len(present) == 1:
            colocation = 0.5
        else:
            colocation = 0.0

        score01 = 0.40 * coverage + 0.25 * prominence + 0.20 * prompt_align + 0.15 * colocation
        return score01, present
