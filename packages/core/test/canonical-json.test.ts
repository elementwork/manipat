import { describe, expect, it } from "vitest";
import { canonicalStringify } from "../src/index.js";

describe("canonicalStringify", () => {
  it("sorts object keys recursively while retaining array order", () => {
    expect(canonicalStringify({ z: 1, a: { y: 2, b: 3 }, list: [3, 2, 1] })).toBe(
      '{"a":{"b":3,"y":2},"list":[3,2,1],"z":1}',
    );
  });

  it("rejects values that cannot be reproduced as canonical JSON", () => {
    expect(() => canonicalStringify({ value: Number.NaN })).toThrow(TypeError);
  });
});
