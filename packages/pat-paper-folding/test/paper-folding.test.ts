import { canonicalStringify, type JsonValue } from "@manipat/core";
import { describe, expect, it } from "vitest";
import {
  generatePaperFoldingQuestion,
  reflectPoint,
  validatePaperFoldingQuestion,
} from "../src/index.js";

describe("paper folding", () => {
  it("reflection is its own inverse", () => {
    const lines = [
      { point: [2, 0] as const, unitDirection: [0, 1] as const },
      { point: [0, 0] as const, unitDirection: [Math.SQRT1_2, Math.SQRT1_2] as const },
    ];
    for (const line of lines) {
      for (const point of [[0.5, 0.5], [1.5, 3.5], [3.5, 2.5]] as const) {
        expect(reflectPoint(reflectPoint(point, line), line)).toEqual(point);
      }
    }
  });

  it("generates 2,000 deterministic, uniquely solvable questions", () => {
    for (let index = 0; index < 2_000; index += 1) {
      const band = ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5;
      const question = generatePaperFoldingQuestion(`fold-${index}`, band);
      expect(validatePaperFoldingQuestion(question).matchingChoiceIndices).toEqual([question.correctChoiceIndex]);
      if (index === 0) {
        expect(canonicalStringify(question as unknown as JsonValue)).toBe(
          canonicalStringify(generatePaperFoldingQuestion("fold-0", band) as unknown as JsonValue),
        );
      }
    }
  }, 60_000);
});
