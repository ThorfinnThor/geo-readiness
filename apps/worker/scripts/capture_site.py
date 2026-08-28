"""Freeze a real site into a deterministic benchmark snapshot.

Fetches the given pages once, strips non-essential markup (keeps JSON-LD, drops
other scripts/styles/comments to keep the fixture small), and writes a JSON
snapshot that a no-network fetch_fn replays. Every real bug we find becomes a
permanent regression guard by capturing the site that exposed it.

    uv run python scripts/capture_site.py <name> <start_url> <path> [<path> ...]

Example:
    uv run python scripts/capture_site.py selectyoursauna https://selectyoursauna.com/ \
        / /de/ /de/rechtliches/ /de/produkte/ /de/produkte/karibu-sauna-sandra-6705/
"""

from __future__ import annotations

import json
import re
import ssl
import sys
import urllib.request
from pathlib import Path

# One-off dev capture tool: tolerate hosts whose cert chain this machine lacks.
_SSL = ssl.create_default_context()
_SSL.check_hostname = False
_SSL.verify_mode = ssl.CERT_NONE

CORPUS = Path(__file__).resolve().parents[1] / "tests" / "corpus"
_UA = "Mozilla/5.0 (compatible; FindYourAIScore-benchmark/1.0)"


def _sanitize(html: str) -> str:
    """Keep JSON-LD; drop other scripts, styles and comments."""

    def keep_ld(m: re.Match[str]) -> str:
        return m.group(0) if "application/ld+json" in m.group(0)[:160].lower() else ""

    html = re.sub(r"<script\b[^>]*>.*?</script>", keep_ld, html, flags=re.S | re.I)
    html = re.sub(r"<style\b[^>]*>.*?</style>", "", html, flags=re.S | re.I)
    html = re.sub(r"<!--.*?-->", "", html, flags=re.S)
    return html.strip()


def _fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    with urllib.request.urlopen(req, timeout=20, context=_SSL) as resp:  # noqa: S310
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="replace")


def main() -> None:
    if len(sys.argv) < 4:
        print(__doc__)
        raise SystemExit(2)
    name, start_url, *paths = sys.argv[1:]
    origin = start_url.rstrip("/")
    origin = origin[: origin.index("/", 8)] if "/" in origin[8:] else origin

    pages: dict[str, str] = {}
    for path in paths:
        url = path if path.startswith("http") else origin + path
        try:
            pages[url] = _sanitize(_fetch(url))
            print(f"  captured {url} ({len(pages[url])} bytes)")
        except Exception as exc:  # noqa: BLE001 — capture is best-effort
            print(f"  SKIP {url}: {exc}")

    CORPUS.mkdir(parents=True, exist_ok=True)
    out = CORPUS / f"{name}.json"
    out.write_text(
        json.dumps({"start_url": start_url, "pages": pages}, ensure_ascii=False, indent=0),
        encoding="utf-8",
    )
    print(f"wrote {out} ({len(pages)} pages)")


if __name__ == "__main__":
    main()
