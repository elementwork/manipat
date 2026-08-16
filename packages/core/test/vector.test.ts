import { describe, expect, it } from "vitest";
import { cross3, dot3, normalize3 } from "../src/index.js";

describe("vector math", () => {
  it("uses a right-handed coordinate system", () => {
    expect(cross3([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });

  it("normalizes vectors without changing direction", () => {
    const normalized = normalize3([3, 4, 0]);
    expect(normalized).toEqual([0.6000000000000001, 0.8, 0]);
    expect(dot3(normalized, [3, 4, 0])).toBeCloseTo(5);
  });

  it("rejects zero-length vectors", () => {
    expect(() => normalize3([0, 0, 0])).toThrow(RangeError);
  });
});
