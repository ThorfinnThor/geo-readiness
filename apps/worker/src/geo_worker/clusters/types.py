"""Typed cluster-generation output."""

from __future__ import annotations

from pydantic import BaseModel


class GeneratedPrompt(BaseModel):
    prompt_key: str
    prompt_text: str
    variant_index: int
    template_id: str


class GeneratedCluster(BaseModel):
    cluster_key: str
    intent: str
    topic: str | None = None
    service: str | None = None
    product: str | None = None
    location: str | None = None
    audience: str | None = None
    language: str
    commercial_intent: float
    relevance: float
    priority: float
    weight: float
    generation_method: str = "rule_v1"
    template_version: str
    prompts: list[GeneratedPrompt] = []
