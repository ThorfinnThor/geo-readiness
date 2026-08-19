"""Intent taxonomy, prompt templates, and deterministic rendering (§13/§14, E07).

Templates are static config; rendering is regex substitution — no LLM, no
network (Golden Rule 3: clusters are rule-based and deterministic).
"""

from .loader import load_taxonomy, load_template_set
from .render import ALLOWED_PLACEHOLDERS, extract_placeholders, render_template
from .types import Intent, Taxonomy, Template, TemplateSet
from .validator import validate_template_set

__all__ = [
    "ALLOWED_PLACEHOLDERS",
    "Intent",
    "Taxonomy",
    "Template",
    "TemplateSet",
    "extract_placeholders",
    "load_taxonomy",
    "load_template_set",
    "render_template",
    "validate_template_set",
]
