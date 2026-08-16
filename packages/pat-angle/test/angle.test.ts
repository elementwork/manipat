import { canonicalStringify, type JsonValue } from "@manipat/core";
import { describe, expect, it } from "vitest";
import {
  generateAngleQuestion,
  validateAngleQuestion,
} from "../src/index.js";

describe("angle discrimination", () => {
  it("is deterministic and independently solvable", () => {
    const first = generateAngleQuestion("angle-replay", 4);
    const second = generateAngleQuestion("angle-replay", 4);
    expect(canonicalStringify(first as unknown as JsonValue)).toBe(
      canonicalStringify(second as unknown as JsonValue),
    );
    expect(validateAngleQuestion(first).matchingChoiceIndices).toEqual([first.correctChoiceIndex]);
  });

  it("validates 10,000 seeds across all difficulty bands", () => {
    for (let index = 0; index < 10_000; index += 1) {
      const question = generateAngleQuestion(`angle-${index}`, ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5);
      expect(validateAngleQuestion(question).passed, `angle-${index}`).toBe(true);
    }
  }, 60_000);
});
