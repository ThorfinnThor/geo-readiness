import { describe, expect, it } from "vitest";

import { isPublicAddress } from "@/lib/robots/fetch";

// The checker accepts a hostname from anyone on the internet, so the address
// filter is the thing standing between it and the internal network.
describe("SSRF address filter", () => {
  it("rejects loopback, link-local, private and reserved IPv4", () => {
    for (const addr of [
      "127.0.0.1",
      "127.1.2.3",
      "10.0.0.1",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254", // cloud instance metadata
      "0.0.0.0",
      "100.64.0.1",
      "198.18.0.1",
      "224.0.0.1",
      "255.255.255.255",
    ]) {
      expect(isPublicAddress(addr), addr).toBe(false);
    }
  });

  it("rejects loopback, unique-local and link-local IPv6, including IPv4-mapped", () => {
    for (const addr of ["::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"]) {
      expect(isPublicAddress(addr), addr).toBe(false);
    }
  });

  it("accepts ordinary public addresses", () => {
    for (const addr of ["93.184.216.34", "8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700::1111"]) {
      expect(isPublicAddress(addr), addr).toBe(true);
    }
  });

  it("rejects malformed input rather than defaulting to public", () => {
    for (const addr of ["", "   ", "999.1.1.1", "1.2.3", "not-an-ip"]) {
      expect(isPublicAddress(addr), JSON.stringify(addr)).toBe(false);
    }
  });
});
