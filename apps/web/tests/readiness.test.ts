import { describe, expect, it } from "vitest";
import { scoreLevel, READINESS_DISCLAIMER } from "@/lib/readiness";

describe("scoreLevel", () => {
  it("maps band boundaries per §23", () => {
    expect(scoreLevel(100)).toBe("Excellent");
    expect(scoreLevel(90)).toBe("Excellent");
    expect(scoreLevel(89)).toBe("Strong");
    expect(scoreLevel(80)).toBe("Strong");
    expect(scoreLevel(79)).toBe("Good");
    expect(scoreLevel(65)).toBe("Good");
    expect(scoreLevel(64)).toBe("Needs improvement");
    expect(scoreLevel(50)).toBe("Needs improvement");
    expect(scoreLevel(49)).toBe("Weak");
    expect(scoreLevel(0)).toBe("Weak");
  });

  it("rejects out-of-range scores", () => {
    expect(() => scoreLevel(-1)).toThrow(RangeError);
    expect(() => scoreLevel(101)).toThrow(RangeError);
    expect(() => scoreLevel(NaN)).toThrow(RangeError);
  });
});

describe("disclaimer", () => {
  it("does not claim actual AI visibility", () => {
    expect(READINESS_DISCLAIMER.toLowerCase()).toContain("does not measure");
  });
});
