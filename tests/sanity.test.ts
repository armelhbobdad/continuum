import { describe, expect, it } from "vitest";

describe("Vitest Configuration", () => {
  it("runs tests successfully", () => {
    expect(true).toBe(true);
  });

  it("supports TypeScript", () => {
    const sum = (a: number, b: number): number => a + b;
    expect(sum(1, 2)).toBe(3);
  });
});
