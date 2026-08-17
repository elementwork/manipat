import type { ValidationCheck } from "@manipat/core";
import { solveCubeStructure } from "./solver.js";
import type { CubeCountingQuestion, CubeCountingValidationResult } from "./types.js";
import { VoxelStructure } from "./voxel-grid.js";

const check = (id: string, passed: boolean): ValidationCheck => ({ id, passed, severity: "error" });

const footprintQuality = (structure: VoxelStructure): {
  readonly hasGap: boolean;
  readonly density: number;
  readonly distinctHeights: number;
} => {
  const heights = new Map<string, number>();
  for (const { x, y, z } of structure.coordinates()) {
    const key = `${x},${y}`;
    heights.set(key, Math.max(heights.get(key) ?? 0, z + 1));
  }
  const columns = [...heights.keys()].map((key) => {
    const [x = 0, y = 0] = key.split(",").map(Number);
    return { x, y };
  });
  if (columns.length === 0) return { hasGap: false, density: 1, distinctHeights: 0 };
  const minX = Math.min(...columns.map(({ x }) => x));
  const maxX = Math.max(...columns.map(({ x }) => x));
  const minY = Math.min(...columns.map(({ y }) => y));
  const maxY = Math.max(...columns.map(({ y }) => y));
  const boundingArea = (maxX - minX + 1) * (maxY - minY + 1);
  return {
    hasGap: columns.length < boundingArea,
    density: columns.length / boundingArea,
    distinctHeights: new Set(heights.values()).size,
  };
};

export const validateCubeCountingQuestion = (
  question: CubeCountingQuestion,
): CubeCountingValidationResult => {
  const structure = new VoxelStructure(question.prompt.figure.cubes);
  const solution = solveCubeStructure(structure);
  const correct = solution.counts[question.prompt.targetPaintedFaces] ?? 0;
  const matches = question.choices.flatMap((choice, index) => choice === correct ? [index] : []);
  const footprint = footprintQuality(structure);
  const checks = [
    check("connected", structure.isConnected()),
    check("supported", structure.isSupported()),
    check("irregular-footprint", footprint.hasGap && footprint.density <= 0.9),
    check("height-variation", footprint.distinctHeights >= 2),
    check("nonzero-answer", correct > 0),
    check("five-choices", question.choices.length === 5),
    check("unique-choices", new Set(question.choices).size === 5),
    check("exactly-one-answer", matches.length === 1),
    check("correct-index", matches[0] === question.correctChoiceIndex),
    check("shared-figure-id", question.prompt.figure.id.length > 0),
    check("renderable", question.prompt.figure.svg.startsWith("<svg")),
  ];
  return { passed: checks.every(({ passed }) => passed), checks, matchingChoiceIndices: matches };
};
