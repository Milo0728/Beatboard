import { describe, expect, it } from "vitest";

import { roundToHalf, scoreSchema } from "./rating";

describe("roundToHalf", () => {
  it("rounds to the nearest 0.5", () => {
    expect(roundToHalf(7.2)).toBe(7);
    expect(roundToHalf(7.7)).toBe(7.5);
    expect(roundToHalf(7.8)).toBe(8);
    expect(roundToHalf(9)).toBe(9);
  });
});

describe("scoreSchema", () => {
  it("accepts valid half-steps within [1, 10]", () => {
    expect(scoreSchema.safeParse(1).success).toBe(true);
    expect(scoreSchema.safeParse(7.5).success).toBe(true);
    expect(scoreSchema.safeParse(10).success).toBe(true);
  });

  it("rejects values out of range", () => {
    expect(scoreSchema.safeParse(0.5).success).toBe(false);
    expect(scoreSchema.safeParse(10.5).success).toBe(false);
  });

  it("rejects values that are not 0.5 steps", () => {
    expect(scoreSchema.safeParse(7.3).success).toBe(false);
  });
});
