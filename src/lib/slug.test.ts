import { describe, expect, it } from "vitest";

import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Bad Bunny")).toBe("bad-bunny");
  });

  it("strips accents", () => {
    expect(slugify("Café Tacvba")).toBe("cafe-tacvba");
  });

  it("removes symbols and collapses extra spaces", () => {
    expect(slugify("  Hello!!  World  ")).toBe("hello-world");
  });

  it("collapses repeated separators and trims them", () => {
    expect(slugify("--a__b--")).toBe("a-b");
  });

  it("returns empty for empty or symbol-only input", () => {
    expect(slugify("")).toBe("");
    expect(slugify("!!!")).toBe("");
  });
});
