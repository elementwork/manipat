import type { ValidationCheck } from "@manipat/core";
import { solveCubeStructure } from "./solver.js";
import type { CubeCountingQuestion, CubeCountingValidationResult } from "./types.js";
import { VoxelStructure } from "./voxel-grid.js";

const check = (id: string, passed: boolean): ValidationCheck => ({ id, passed, severity: "error" });

export const validateCubeCountingQuestion = (
  question: CubeCountingQuestion,
): CubeCountingValidationResult => {
  const structure = new VoxelStructure(question.prompt.figure.cubes);
  const solution = solveCubeStructure(structure);
  const correct = solution.counts[question.prompt.targetPaintedFaces] ?? 0;
  const matches = question.choices.flatMap((choice, index) => choice === correct ? [index] : []);
  const checks = [
    check("connected", structure.isConnected()),
    check("supported", structure.isSupported()),
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
