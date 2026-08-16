import type { ValidationCheck } from "@manipat/core";
import { measureAngleDegrees, solveAngleQuestion } from "./solver.js";
import type { AngleQuestion, AngleValidationResult } from "./types.js";

const check = (id: string, passed: boolean): ValidationCheck => ({ id, passed, severity: "error" });

export const validateAngleQuestion = (question: AngleQuestion): AngleValidationResult => {
  const matches = solveAngleQuestion(question);
  const measurements = question.prompt.items.map(measureAngleDegrees).sort((a, b) => a - b);
  const minimumGap = Math.min(...measurements.slice(1).map((angle, index) => angle - (measurements[index] ?? angle)));
  const serializedChoices = question.choices.map(({ order }) => order.join(","));
  const rayLengths = question.prompt.items.flatMap(({ rayLengths }) => rayLengths);
  const checks = [
    check("four-items", question.prompt.items.length === 4),
    check("four-choices", question.choices.length === 4),
    check("unique-angle-values", minimumGap > 1e-6),
    check("unique-choices", new Set(serializedChoices).size === 4),
    check("exactly-one-answer", matches.length === 1),
    check("correct-index", matches[0] === question.correctChoiceIndex),
    check("positive-rays", rayLengths.every((length) => length > 0)),
    check("renderable-svg", question.prompt.svg.startsWith("<svg")),
  ];
  return { passed: checks.every(({ passed }) => passed), checks, matchingChoiceIndices: matches };
};
