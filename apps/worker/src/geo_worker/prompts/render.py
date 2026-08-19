"""Deterministic template rendering and placeholder extraction."""

from __future__ import annotations

import re

# The complete set of placeholders any template may reference.
ALLOWED_PLACEHOLDERS = frozenset(
    {
        "service",
        "service_a",
        "service_b",
        "location",
        "product",
        "product_category",
        "audience",
        "problem",
        "brand",
        "industry",
        "topic",
    }
)

_PLACEHOLDER_RE = re.compile(r"\{([a-z_]+)\}")


def extract_placeholders(text: str) -> set[str]:
    """Return the placeholder names referenced in a template string."""
    return set(_PLACEHOLDER_RE.findall(text))


def render_template(text: str, context: dict[str, str]) -> str | None:
    """Render a template, or return None if any placeholder value is missing.

    Returning None (rather than emitting a half-filled prompt) keeps generated
    prompts natural — a cluster only produces prompts it has data for.
    """
    needed = extract_placeholders(text)
    if any(not context.get(name) for name in needed):
        return None
    rendered = _PLACEHOLDER_RE.sub(lambda m: context[m.group(1)], text)
    return " ".join(rendered.split())
