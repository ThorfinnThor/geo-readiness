"""Typed extraction result."""

from __future__ import annotations

from pydantic import BaseModel


class Link(BaseModel):
    href: str
    text: str


class ExtractedPage(BaseModel):
    final_url: str
    title: str | None = None
    meta_description: str | None = None
    canonical_url: str | None = None
    robots_meta: str | None = None
    language: str | None = None
    hreflang: list[str] = []
    h1: str | None = None
    headings: dict[str, list[str]] = {}
    visible_text: str = ""
    json_ld: list[dict] = []
    open_graph: dict[str, str] = {}
    internal_links: list[Link] = []
    external_links: list[Link] = []
    page_type: str = "other"
    content_hash: str = ""
