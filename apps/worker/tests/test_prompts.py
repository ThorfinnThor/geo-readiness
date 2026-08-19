"""Intent taxonomy, templates, validator, and rendering tests (E07)."""

from __future__ import annotations

import pytest

from geo_worker.prompts import (
    ALLOWED_PLACEHOLDERS,
    load_taxonomy,
    load_template_set,
    render_template,
    validate_template_set,
)
from geo_worker.prompts.types import Template, TemplateSet

# The 13 intents of §13.
EXPECTED_INTENTS = {
    "category_discovery",
    "recommendation",
    "best_of",
    "comparison",
    "alternative",
    "local",
    "problem_solution",
    "product_fit",
    "trust",
    "pricing",
    "integration",
    "combined_service",
    "branded",
}


def test_taxonomy_loads_all_intents() -> None:
    tax = load_taxonomy()
    assert tax.version == "1"
    assert tax.keys == EXPECTED_INTENTS
    assert tax.by_key("recommendation").commercial_intent == 0.9
    assert tax.by_key("branded").branded is True
    assert tax.by_key("local").branded is False


@pytest.mark.parametrize("language", ["de", "en"])
def test_template_set_is_valid(language: str) -> None:
    tax = load_taxonomy()
    ts = load_template_set(language)
    assert ts.version == "1"
    errors = validate_template_set(ts, tax)
    assert errors == [], errors

    # Every declared placeholder is allowed, and ids are unique.
    ids = [t.id for t in ts.all_templates()]
    assert len(ids) == len(set(ids))
    for tpl in ts.all_templates():
        assert set(tpl.placeholders) <= ALLOWED_PLACEHOLDERS


def test_render_is_natural() -> None:
    out = render_template(
        "Welche Anbieter gibt es für {service} in {location}?",
        {"service": "Photovoltaik", "location": "Ulm"},
    )
    assert out == "Welche Anbieter gibt es für Photovoltaik in Ulm?"


def test_render_missing_placeholder_returns_none() -> None:
    assert render_template("Was kostet {service}?", {}) is None
    assert render_template("Was kostet {service}?", {"service": ""}) is None
    # No leftover braces are ever emitted.
    out = render_template("Was kostet {service}?", {"service": "SEO"})
    assert out is not None and "{" not in out and "}" not in out


def test_validator_flags_bad_templates() -> None:
    tax = load_taxonomy()
    bad = TemplateSet(
        language="xx",
        version="1",
        templates={
            "local": [
                Template(
                    id="bad_1",
                    text="Welche {service} in {unknown_ph}?",
                    placeholders=["service"],
                )
            ],
            "not_a_real_intent": [Template(id="bad_2", text="Static text", placeholders=[])],
        },
    )
    errors = validate_template_set(bad, tax)
    joined = " ".join(errors)
    assert "not in taxonomy" in joined
    assert "unknown placeholders" in joined
    assert "declared placeholders" in joined
