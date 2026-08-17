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

  it("renders fold frames as solid current paper plus dotted folded-away paper", () => {
    const question = generatePaperFoldingQuestion("fold-render-regression", 4);
    expect(question.prompt.stepSvgs).toHaveLength(question.prompt.folds.length + 1);
    expect(question.prompt.stepSvgs.every((svg) => svg.includes('viewBox="-0.2 -0.2 4.4 4.4"'))).toBe(true);
    expect(question.choices.every(({ svg }) => svg.includes('viewBox="-0.2 -0.2 4.4 4.4"'))).toBe(true);

    const foldFrames = question.prompt.stepSvgs.slice(0, -1);
    expect(foldFrames.every((svg) => svg.includes("data-folded-away"))).toBe(true);
    expect(foldFrames.every((svg) => svg.includes("stroke-dasharray"))).toBe(true);
    expect(foldFrames.every((svg) => !svg.includes("data-fold-id"))).toBe(true);
    expect(foldFrames.every((svg) => !svg.includes("<line"))).toBe(true);

    const finalStep = question.prompt.stepSvgs.at(-1)!;
    expect(finalStep).toContain("<polygon");
    expect(finalStep).toContain("<circle");
    expect(finalStep).not.toContain("data-folded-away");
    expect(finalStep).not.toContain("stroke-dasharray");
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
