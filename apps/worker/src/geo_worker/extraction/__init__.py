"""Deterministic HTML & structured-data extraction (§11, E05).

Pure functions: HTML bytes + final URL in → structured, evidence-ready fields
out. No network, no LLM. Website content is untrusted data and is never
executed or interpreted as instructions.
"""

from .html import extract_page
from .types import ExtractedPage, Link

__all__ = ["ExtractedPage", "Link", "extract_page"]
