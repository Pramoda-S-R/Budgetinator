import { describe, expect, it } from "vitest";

import { resolveSortOrder } from "./-sort-order";

describe("resolveSortOrder", () => {
  it("uses the requested sort order when provided", () => {
    expect(resolveSortOrder(null, 5)).toBe(5);
    expect(resolveSortOrder(2, 1)).toBe(1);
  });

  it("increments the last sort order when no request is given", () => {
    expect(resolveSortOrder(undefined)).toBe(0);
    expect(resolveSortOrder(3)).toBe(4);
    expect(resolveSortOrder(0)).toBe(1);
  });

  it("normalizes negative or fractional inputs", () => {
    expect(resolveSortOrder(3.7)).toBe(4);
    expect(resolveSortOrder(-1, -3)).toBe(0);
  });
});
