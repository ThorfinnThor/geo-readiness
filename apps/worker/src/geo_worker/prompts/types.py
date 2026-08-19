"""Typed taxonomy and template models."""

from __future__ import annotations

from pydantic import BaseModel


class Intent(BaseModel):
    key: str
    commercial_intent: float
    branded: bool = False


class Taxonomy(BaseModel):
    version: str
    intents: list[Intent]

    def by_key(self, key: str) -> Intent | None:
        return next((i for i in self.intents if i.key == key), None)

    @property
    def keys(self) -> set[str]:
        return {i.key for i in self.intents}


class Template(BaseModel):
    id: str
    text: str
    placeholders: list[str]


class TemplateSet(BaseModel):
    language: str
    version: str
    templates: dict[str, list[Template]]

    def all_templates(self) -> list[Template]:
        return [t for group in self.templates.values() for t in group]
