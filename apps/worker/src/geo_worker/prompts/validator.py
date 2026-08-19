"""Template-set validation: placeholders, uniqueness, taxonomy coverage."""

from __future__ import annotations

from .render import ALLOWED_PLACEHOLDERS, extract_placeholders
from .types import Taxonomy, TemplateSet


def validate_template_set(ts: TemplateSet, taxonomy: Taxonomy) -> list[str]:
    """Return a list of human-readable problems; empty means valid."""
    errors: list[str] = []
    seen_ids: set[str] = set()

    for intent_key, templates in ts.templates.items():
        if intent_key not in taxonomy.keys:
            errors.append(f"{ts.language}: intent '{intent_key}' not in taxonomy")
        for tpl in templates:
            if tpl.id in seen_ids:
                errors.append(f"{ts.language}: duplicate template id '{tpl.id}'")
            seen_ids.add(tpl.id)

            actual = extract_placeholders(tpl.text)
            declared = set(tpl.placeholders)
            if actual != declared:
                errors.append(
                    f"{ts.language}:{tpl.id}: declared placeholders {sorted(declared)} "
                    f"!= actual {sorted(actual)}"
                )
            unknown = actual - ALLOWED_PLACEHOLDERS
            if unknown:
                errors.append(f"{ts.language}:{tpl.id}: unknown placeholders {sorted(unknown)}")
            if "{}" in tpl.text or tpl.text.count("{") != tpl.text.count("}"):
                errors.append(f"{ts.language}:{tpl.id}: malformed braces")

    return errors
