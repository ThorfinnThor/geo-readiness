import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { triggerWorker } from "@/lib/scans/dispatch";

const ORIGINAL = { ...process.env };

describe("triggerWorker", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL };
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("skips silently when not configured", async () => {
    delete process.env.GITHUB_DISPATCH_TOKEN;
    delete process.env.GITHUB_REPO;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await triggerWorker();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts a repository_dispatch when configured", async () => {
    process.env.GITHUB_DISPATCH_TOKEN = "tok";
    process.env.GITHUB_REPO = "owner/name";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await triggerWorker();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.github.com/repos/owner/name/dispatches");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual({ event_type: "scan-enqueued" });
  });

  it("does not throw on a non-ok response", async () => {
    process.env.GITHUB_DISPATCH_TOKEN = "tok";
    process.env.GITHUB_REPO = "owner/name";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "forbidden" }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(triggerWorker()).resolves.toBeUndefined();
  });

  it("does not throw when fetch rejects", async () => {
    process.env.GITHUB_DISPATCH_TOKEN = "tok";
    process.env.GITHUB_REPO = "owner/name";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(triggerWorker()).resolves.toBeUndefined();
  });
});
