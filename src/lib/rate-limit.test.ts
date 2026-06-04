import { beforeEach, describe, expect, it } from "vitest";

import { __resetRateLimitStore, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => __resetRateLimitStore());

  it("allows up to the limit within a window, then blocks", () => {
    const now = 1000;
    expect(rateLimit("k", 3, 1000, now).ok).toBe(true);
    expect(rateLimit("k", 3, 1000, now).ok).toBe(true);
    expect(rateLimit("k", 3, 1000, now).ok).toBe(true);
    const blocked = rateLimit("k", 3, 1000, now);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("opens a fresh window once it elapses", () => {
    expect(rateLimit("k", 1, 1000, 0).ok).toBe(true);
    expect(rateLimit("k", 1, 1000, 500).ok).toBe(false);
    expect(rateLimit("k", 1, 1000, 1000).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    expect(rateLimit("a", 1, 1000, 0).ok).toBe(true);
    expect(rateLimit("b", 1, 1000, 0).ok).toBe(true);
    expect(rateLimit("a", 1, 1000, 0).ok).toBe(false);
  });

  it("reports the remaining allowance", () => {
    expect(rateLimit("k", 5, 1000, 0).remaining).toBe(4);
    expect(rateLimit("k", 5, 1000, 0).remaining).toBe(3);
  });
});
