"""Action engine (§25, E11).

Rules RDY-001..010 turn readiness gaps into concrete, evidence-backed actions.
Every action carries evidence (no action without evidence), a deterministic
priority, and a verification hint — and never claims AI visibility or rankings.
"""

from .rules import compute_actions
from .types import Action

__all__ = ["Action", "compute_actions"]
