import { describe, expect, it } from "vitest";
import { fingerprint64 } from "../src/index.js";

describe("fingerprint64", () => {
  it("is stable and input-sensitive", () => {
    expect(fingerprint64("manipat")).toBe(fingerprint64("manipat"));
    expect(fingerprint64("manipat")).not.toBe(fingerprint64("ManipAT"));
    expect(fingerprint64("manipat")).toMatch(/^[0-9a-f]{16}$/);
  });
});
