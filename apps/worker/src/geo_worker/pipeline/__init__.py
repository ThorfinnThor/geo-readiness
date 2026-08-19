"""Scan orchestration + report assembly.

run_pipeline ties the engines together (crawl → extract → profile → clusters →
coverage → readiness → actions); build_report turns the result into the JSON
report contract the web UI renders (Free Preview + Full Report).
"""

from .report import ReportDocument, build_report
from .runner import ScanResult, run_pipeline

__all__ = ["ReportDocument", "ScanResult", "build_report", "run_pipeline"]
