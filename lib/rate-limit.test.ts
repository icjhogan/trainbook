import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, __resetRateLimits } from "./rate-limit";

beforeEach(() => __resetRateLimits());

describe("rateLimit", () => {
  it("allows requests up to the limit", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("k", 3, 1000, 0).ok).toBe(true);
    }
  });

  it("blocks the request that exceeds the limit and reports retry-after", () => {
    rateLimit("k", 2, 1000, 0);
    rateLimit("k", 2, 1000, 0);
    const blocked = rateLimit("k", 2, 1000, 500);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1); // 500ms remaining -> ceil to 1s
  });

  it("resets after the window elapses", () => {
    rateLimit("k", 1, 1000, 0);
    expect(rateLimit("k", 1, 1000, 500).ok).toBe(false);
    expect(rateLimit("k", 1, 1000, 1000).ok).toBe(true); // new window at resetAt
  });

  it("tracks separate keys independently", () => {
    expect(rateLimit("a", 1, 1000, 0).ok).toBe(true);
    expect(rateLimit("a", 1, 1000, 0).ok).toBe(false);
    expect(rateLimit("b", 1, 1000, 0).ok).toBe(true);
  });
});
