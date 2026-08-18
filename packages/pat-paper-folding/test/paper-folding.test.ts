import { canonicalStringify, type JsonValue } from "@manipat/core";
import { describe, expect, it } from "vitest";
import {
  generatePaperFoldingQuestion,
  reflectPoint,
  renderFoldStep,
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

  it("renders golden-style layered fold panels over the original dashed square", () => {
    const quarterFold = {
      id: "quarter-right-in",
      line: { point: [3, 0] as const, unitDirection: [0, 1] as const },
      movingSide: -1 as const,
    };
    const svg = renderFoldStep([quarterFold], [], 0);

    expect(svg).toContain('data-original-position="true"');
    expect(svg).toContain("stroke-dasharray");
    expect(svg.match(/data-paper-panel=/gu)).toHaveLength(2);
    expect(svg).not.toContain("data-folded-away");
    expect(svg).not.toContain("data-fold-id");
    expect(svg).not.toContain("<line");
  });

  it("keeps the original dashed reference in every fold and punch frame", () => {
    const question = generatePaperFoldingQuestion("fold-render-regression", 4);
    expect(question.prompt.stepSvgs).toHaveLength(question.prompt.folds.length + 1);
    expect(question.prompt.stepSvgs.every((svg) => svg.includes('viewBox="-0.2 -0.2 4.4 4.4"'))).toBe(true);
    expect(question.choices.every(({ svg }) => svg.includes('viewBox="-0.2 -0.2 4.4 4.4"'))).toBe(true);
    expect(question.prompt.stepSvgs.every((svg) => svg.includes('data-original-position="true"'))).toBe(true);
    expect(question.prompt.stepSvgs.every((svg) => svg.includes("stroke-dasharray"))).toBe(true);
    expect(question.prompt.stepSvgs.every((svg) => svg.includes("data-paper-panel"))).toBe(true);
    expect(question.prompt.stepSvgs.every((svg) => !svg.includes("data-folded-away"))).toBe(true);
    expect(question.prompt.stepSvgs.every((svg) => !svg.includes("data-fold-id"))).toBe(true);
    expect(question.prompt.stepSvgs.every((svg) => !svg.includes("<line"))).toBe(true);

    const finalStep = question.prompt.stepSvgs.at(-1)!;
    expect(finalStep).toContain("<polygon");
    expect(finalStep).toContain("<circle");
    expect(finalStep).toContain('data-original-position="true"');
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
