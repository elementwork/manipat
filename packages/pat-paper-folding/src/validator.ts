import { EPS, type ValidationCheck, type Vec2 } from "@manipat/core";
import { applyFold, createInitialFoldState, signedDistanceFromFold } from "./fold.js";
import { solvePaperFoldingQuestion } from "./solver.js";
import type { PaperFoldingQuestion, PaperFoldingValidationResult } from "./types.js";

const check = (id: string, passed: boolean): ValidationCheck => ({ id, passed, severity: "error" });
const onGrid = ([x, y]: readonly [number, number]): boolean =>
  x >= 0.5 && x <= 3.5 && y >= 0.5 && y <= 3.5
  && Number.isInteger(x - 0.5) && Number.isInteger(y - 0.5);
const pointKey = ([x, y]: Vec2): string => `${x},${y}`;
const patternDistance = (first: readonly Vec2[], second: readonly Vec2[]): number => {
  const a = new Set(first.map(pointKey));
  const b = new Set(second.map(pointKey));
  let distance = 0;
  for (const key of a) if (!b.has(key)) distance += 1;
  for (const key of b) if (!a.has(key)) distance += 1;
  return distance;
};

const foldsReduceState = (question: PaperFoldingQuestion): boolean => {
  let state = createInitialFoldState();
  let occupied = new Set(state.layers.map(({ currentCenter }) => pointKey(currentCenter))).size;
  for (const fold of question.prompt.folds) {
    const next = applyFold(state, fold);
    const nextOccupied = new Set(next.layers.map(({ currentCenter }) => pointKey(currentCenter))).size;
    if (nextOccupied >= occupied) return false;
    if (next.layers.some(({ currentCenter: [x, y] }) => x < 0.5 || x > 3.5 || y < 0.5 || y > 3.5)) return false;
    state = next;
    occupied = nextOccupied;
  }
  return true;
};

export const validatePaperFoldingQuestion = (
  question: PaperFoldingQuestion,
): PaperFoldingValidationResult => {
  const matches = solvePaperFoldingQuestion(question);
  const allHoles = question.choices.flatMap(({ holes }) => holes);
  const correct = question.choices[question.correctChoiceIndex]?.holes ?? [];
  const wrongDistances = question.choices.flatMap(({ holes }, index) =>
    index === question.correctChoiceIndex ? [] : [patternDistance(correct, holes)]);
  const checks = [
    check("fold-count", question.prompt.folds.length >= 1 && question.prompt.folds.length <= 3),
    check("effective-folds", foldsReduceState(question)),
    check("choice-count", question.choices.length === 5),
    check("unique-choices", new Set(question.choices.map(({ fingerprint }) => fingerprint)).size === 5),
    check("choice-diversity", wrongDistances.every((distance) => distance >= 1)
      && wrongDistances.filter((distance) => distance >= 2).length >= 2),
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
