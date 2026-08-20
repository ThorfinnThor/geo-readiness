// Wake the GitHub Actions worker the moment a scan is enqueued
// (repository_dispatch → .github/workflows/process-scans.yml).
//
// Best-effort by design: if this fails, the job is already safely in the
// Postgres queue and the workflow's safety-net cron will drain it, so a dispatch
// error must never fail the user's scan submission. Requires env:
//   GITHUB_DISPATCH_TOKEN — token with repo Contents:write (fine-grained) or
//                           classic `repo` scope; permits repository_dispatch.
//   GITHUB_REPO           — "owner/name", e.g. "ThorfinnThor/geo-readiness".
// When either is unset (local/dev), it skips silently.

const GITHUB_API = "https://api.github.com";
const EVENT_TYPE = "scan-enqueued";
const TIMEOUT_MS = 4000;

export async function triggerWorker(): Promise<void> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return; // not configured — nothing to wake

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${GITHUB_API}/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event_type: EVENT_TYPE }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`worker dispatch failed: ${res.status} ${detail}`);
    }
  } catch (err) {
    console.error("worker dispatch error:", err);
  } finally {
    clearTimeout(timer);
  }
}
