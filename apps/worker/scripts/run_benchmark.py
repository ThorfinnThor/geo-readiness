"""Run the V2 benchmark corpus and write a calibration report (§Phase 14).

Deterministic, no network. Runs the labelled corpus through V1 and V2 and emits
a human-readable markdown report plus a JSON sidecar for diffing across runs:

    uv run python scripts/run_benchmark.py

Outputs land in apps/worker/benchmark_out/. When real URLs are available, add
them as BenchmarkCase entries (network fetch_fn + tier label) and re-run — the
report format is unchanged.
"""

from __future__ import annotations

import json
from pathlib import Path

from geo_worker.benchmark import CaseScores, run_benchmark

OUT = Path(__file__).resolve().parents[1] / "benchmark_out"


def _fmt(v: float | None) -> str:
    return f"{v:.1f}" if v is not None else "—"


def _rows(scores: list[CaseScores]) -> list[dict]:
    return [
        {
            "name": s.name,
            "tier": s.tier,
            "overall": s.overall,
            "components": s.components,
            "stages": s.stages,
        }
        for s in scores
    ]


def _table(scores: list[CaseScores], with_stages: bool) -> str:
    head = "| case | tier | overall |"
    sep = "|---|---|---|"
    if with_stages:
        head += " retrieval | citation | answer |"
        sep += "---|---|---|"
    lines = [head, sep]
    for s in sorted(scores, key=lambda x: -x.overall):
        row = f"| {s.name} | {s.tier} | {s.overall:.1f} |"
        if with_stages:
            row += (
                f" {_fmt(s.stages['retrieval_readiness'])} |"
                f" {_fmt(s.stages['citation_readiness'])} |"
                f" {_fmt(s.stages['answer_extractability'])} |"
            )
        lines.append(row)
    return "\n".join(lines)


def main() -> None:
    report = run_benchmark()
    OUT.mkdir(parents=True, exist_ok=True)

    md = f"""# V2 benchmark & calibration report

Deterministic fixture corpus (no network). Real URLs plug into the same harness.

## Ordering (overall score must rise weak → medium → strong)

- V1 ordering holds: **{report.ordering_ok_v1}**
- V2 ordering holds: **{report.ordering_ok_v2}**

## Divergence V1 → V2

- Mean |Δ overall|: **{report.mean_abs_overall_delta:.2f}**
- Largest single shift: **{report.max_overall_delta[0]}** ({report.max_overall_delta[1]:.2f})

## V1 overall + components

{_table(report.v1, with_stages=False)}

## V2 overall + stage scores

{_table(report.v2, with_stages=True)}

---
*Stage scores are diagnostic and do not enter the overall score. This report
makes no judgement about which methodology is "right" — that is what the tier
labels and, later, real URLs are for.*
"""
    (OUT / "report.md").write_text(md, encoding="utf-8")
    (OUT / "report.json").write_text(
        json.dumps(
            {
                "ordering_ok_v1": report.ordering_ok_v1,
                "ordering_ok_v2": report.ordering_ok_v2,
                "mean_abs_overall_delta": report.mean_abs_overall_delta,
                "max_overall_delta": list(report.max_overall_delta),
                "v1": _rows(report.v1),
                "v2": _rows(report.v2),
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT / 'report.md'} and {OUT / 'report.json'}")
    print(
        f"ordering v1={report.ordering_ok_v1} v2={report.ordering_ok_v2} "
        f"mean|Δ|={report.mean_abs_overall_delta:.2f} "
        f"worst={report.max_overall_delta[0]}({report.max_overall_delta[1]:.2f})"
    )


if __name__ == "__main__":
    main()
