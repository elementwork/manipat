import { canonicalStringify, type JsonValue } from "@manipat/core";
import { describe, expect, it } from "vitest";
import {
  buildPaperVisualFoldTransitions,
  generatePaperFoldingQuestion,
  isSinglePhysicalFoldTransition,
  reflectPoint,
  renderFoldStep,
  renderOriginalSheet,
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

  it("renders the original square as its own fixed-orientation panel", () => {
    const svg = renderOriginalSheet();
    expect(svg).toContain('data-original-sheet="true"');
    expect(svg).toContain('viewBox="-0.2 -0.2 4.4 4.4"');
    expect(svg).not.toContain("stroke-dasharray");
    expect(svg).not.toMatch(/transform\s*=\s*["'][^"']*(?:rotate\s*\(|scale\s*\(\s*-)/iu);
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

  it("exposes canonical visual panel transitions for hinge animation", () => {
    const folds = [
      {
        id: "quarter-right-in",
        line: { point: [3, 0] as const, unitDirection: [0, 1] as const },
        movingSide: -1 as const,
      },
      {
        id: "center-top-bottom",
        line: { point: [0, 2] as const, unitDirection: [1, 0] as const },
        movingSide: 1 as const,
      },
    ];
    const transitions = buildPaperVisualFoldTransitions(folds);
    expect(transitions).toHaveLength(2);
    expect(transitions[0]).toMatchObject({ foldId: "quarter-right-in" });
    expect(transitions[0]?.stationaryPolygons.length).toBeGreaterThan(0);
    expect(transitions[0]?.movingPolygons.length).toBeGreaterThan(0);
    expect(transitions[1]?.movingPolygons.length).toBeGreaterThan(0);
    expect(transitions.flatMap(({ movingPolygons }) => movingPolygons).every((polygon) => polygon.length >= 3)).toBe(true);
    expect(isSinglePhysicalFoldTransition([], folds[0]!)).toBe(true);
    expect(isSinglePhysicalFoldTransition([folds[0]!], folds[1]!)).toBe(true);
  });

  it("persists the complete consecutive question sequence without rotating or flipping the page", () => {
    const question = generatePaperFoldingQuestion("fold-render-regression", 4);
    expect(question.prompt.originalSvg).toContain('data-original-sheet="true"');
    expect(question.prompt.stepSvgs).toHaveLength(question.prompt.folds.length + 1);
    expect(question.choices.every(({ svg }) => svg.includes('viewBox="-0.2 -0.2 4.4 4.4"'))).toBe(true);
    expect(question.prompt.stepSvgs.every((svg) => svg.includes('viewBox="-0.2 -0.2 4.4 4.4"'))).toBe(true);
    expect(question.prompt.stepSvgs.every((svg) => svg.includes('data-original-position="true"'))).toBe(true);
    expect(question.prompt.stepSvgs.every((svg) => svg.includes("stroke-dasharray"))).toBe(true);
    expect(question.prompt.stepSvgs.every((svg) => svg.includes("data-paper-panel"))).toBe(true);
    expect(question.prompt.stepSvgs.every((svg) => !svg.includes("data-folded-away"))).toBe(true);
    expect(question.prompt.stepSvgs.every((svg) => !svg.includes("data-fold-id"))).toBe(true);
    expect(question.prompt.stepSvgs.every((svg) => !svg.includes("<line"))).toBe(true);
    expect([question.prompt.originalSvg, ...question.prompt.stepSvgs].every((svg) =>
      !/transform\s*=\s*["'][^"']*(?:rotate\s*\(|scale\s*\(\s*-)/iu.test(svg))).toBe(true);

    question.prompt.stepSvgs.slice(0, -1).forEach((svg, index) => {
      expect(svg).toContain(`<title>Paper folding fold ${index + 1}</title>`);
    });
    const finalStep = question.prompt.stepSvgs.at(-1)!;
    expect(finalStep).toContain("<title>Paper folding punch</title>");
    expect(finalStep).toContain("<polygon");
    expect(finalStep).toContain("<circle");
    expect(finalStep).toContain('data-original-position="true"');

    const completed = [] as typeof question.prompt.folds[number][];
    for (const fold of question.prompt.folds) {
      expect(isSinglePhysicalFoldTransition(completed, fold)).toBe(true);
      completed.push(fold);
    }
    expect(validatePaperFoldingQuestion(question).checks.find(({ id }) => id === "single-physical-folds")?.passed).toBe(true);
  });

  it("generates 2,000 deterministic, uniquely solvable questions", () => {
    for (let index = 0; index < 2_000; index += 1) {
      const band = ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5;
      const question = generatePaperFoldingQuestion(`fold-${index}`, band);
      const validation = validatePaperFoldingQuestion(question);
      expect(validation.matchingChoiceIndices).toEqual([question.correctChoiceIndex]);
      expect(validation.checks.find(({ id }) => id === "single-physical-folds")?.passed).toBe(true);
      if (index === 0) {
        expect(canonicalStringify(question as unknown as JsonValue)).toBe(
          canonicalStringify(generatePaperFoldingQuestion("fold-0", band) as unknown as JsonValue),
        );
      }
    }
  }, 60_000);
});
