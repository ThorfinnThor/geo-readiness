import { describe, expect, it } from "vitest";

import { InvalidDomainError, normalizeDomain } from "@/lib/scans/domain";

describe("normalizeDomain", () => {
  it("normalizes valid domains", () => {
    expect(normalizeDomain("Example.com")).toBe("example.com");
    expect(normalizeDomain("  https://Example.com/path?q=1 ")).toBe("example.com");
    expect(normalizeDomain("sub.example.co.uk")).toBe("sub.example.co.uk");
    expect(normalizeDomain("example.com.")).toBe("example.com");
  });

  it("rejects invalid or non-public hosts", () => {
    for (const bad of ["", "localhost", "svc.local", "foo.internal", "nodot", "10.0.0.1", "a b.com"]) {
      expect(() => normalizeDomain(bad)).toThrow(InvalidDomainError);
    }
  });
});
