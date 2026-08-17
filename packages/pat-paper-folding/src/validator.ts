import { EPS, type ValidationCheck } from "@manipat/core";
import { signedDistanceFromFold } from "./fold.js";
import { solvePaperFoldingQuestion } from "./solver.js";
import type { PaperFoldingQuestion, PaperFoldingValidationResult } from "./types.js";

const check = (id: string, passed: boolean): ValidationCheck => ({ id, passed, severity: "error" });
const onGrid = ([x, y]: readonly [number, number]): boolean =>
  x >= 0.5 && x <= 3.5 && y >= 0.5 && y <= 3.5
  && Number.isInteger(x - 0.5) && Number.isInteger(y - 0.5);

export const validatePaperFoldingQuestion = (
  question: PaperFoldingQuestion,
): PaperFoldingValidationResult => {
  const matches = solvePaperFoldingQuestion(question);
  const allHoles = question.choices.flatMap(({ holes }) => holes);
  const checks = [
    check("fold-count", question.prompt.folds.length >= 1 && question.prompt.folds.length <= 5),
    check("choice-count", question.choices.length === 5),
    check("unique-choices", new Set(question.choices.map(({ fingerprint }) => fingerprint)).size === 5),
    check("exactly-one-answer", matches.length === 1),
    check("correct-index", matches[0] === question.correctChoiceIndex),
    check("grid-holes", allHoles.every(onGrid)),
    check("punch-off-boundaries", question.prompt.punches.every((point) =>
      question.prompt.folds.every(({ line }) => Math.abs(signedDistanceFromFold(point, line)) > EPS.point))),
    check("renderable", question.prompt.stepSvgs.every((svg) => svg.startsWith("<svg"))
      && question.choices.every(({ svg }) => svg.startsWith("<svg"))),
  ];
  return { passed: checks.every(({ passed }) => passed), checks, matchingChoiceIndices: matches };
};
