import { describe, expect, it } from "vitest";

import { hashToken, safeEqual, hashIp, generateToken } from "@/lib/auth/tokens";
import { isSameOrigin, isCsrfTokenValid } from "@/lib/auth/csrf";

describe("tokens", () => {
  it("hashes deterministically to 64 hex chars", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("generates distinct high-entropy tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
  });

  it("safeEqual compares by value and length", () => {
    expect(safeEqual("secret", "secret")).toBe(true);
    expect(safeEqual("secret", "secreT")).toBe(false);
    expect(safeEqual("secret", "secret-longer")).toBe(false);
  });

  it("hashIp returns null for empty and hex for values", () => {
    expect(hashIp(null)).toBeNull();
    expect(hashIp("1.2.3.4")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("csrf", () => {
  it("accepts matching origin host", () => {
    expect(isSameOrigin("https://app.example", null, ["app.example"])).toBe(true);
    expect(isSameOrigin(null, "https://app.example/x", ["app.example"])).toBe(true);
  });

  it("rejects cross-origin and missing headers", () => {
    expect(isSameOrigin("https://evil.example", null, ["app.example"])).toBe(false);
    expect(isSameOrigin(null, null, ["app.example"])).toBe(false);
    expect(isSameOrigin("not-a-url", null, ["app.example"])).toBe(false);
  });

  it("double-submit token must match", () => {
    expect(isCsrfTokenValid("t", "t")).toBe(true);
    expect(isCsrfTokenValid("t", "x")).toBe(false);
    expect(isCsrfTokenValid(undefined, "t")).toBe(false);
  });
});
