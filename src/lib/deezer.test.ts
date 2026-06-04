import { describe, expect, it } from "vitest";

import { extractFeatures } from "./deezer";

describe("extractFeatures", () => {
  it("parses a parenthesised feat.", () => {
    expect(extractFeatures("WANDA (feat. Bad Bunny)")).toEqual({
      cleanTitle: "WANDA",
      features: ["Bad Bunny"],
    });
  });

  it("splits multiple collaborators", () => {
    expect(extractFeatures("Song (feat. Drake & Future)")).toEqual({
      cleanTitle: "Song",
      features: ["Drake", "Future"],
    });
  });

  it("handles the dash style", () => {
    expect(extractFeatures("Title - feat. Someone")).toEqual({
      cleanTitle: "Title",
      features: ["Someone"],
    });
  });

  it("handles 'with' inside parentheses", () => {
    expect(extractFeatures("Song (with Rosalia)")).toEqual({
      cleanTitle: "Song",
      features: ["Rosalia"],
    });
  });

  it("splits trailing comma/ampersand lists", () => {
    expect(extractFeatures("Track feat. A, B & C")).toEqual({
      cleanTitle: "Track",
      features: ["A", "B", "C"],
    });
  });

  it("returns the title unchanged when there are no features", () => {
    expect(extractFeatures("Plain Song")).toEqual({
      cleanTitle: "Plain Song",
      features: [],
    });
  });
});
