import { EPS, type Segment2, type ValidationCheck } from "@manipat/core";
import { canonicalizeOrthographicView } from "@manipat/geometry";
import { solveTfeQuestion } from "./solver.js";
import type { TfeQuestion, TfeValidationResult } from "./types.js";

const segmentLength = ({ a, b }: Segment2): number => Math.hypot(b[0] - a[0], b[1] - a[1]);
const check = (id: string, passed: boolean): ValidationCheck => ({ id, passed, severity: "error" });

export const validateTfeQuestion = (question: TfeQuestion): TfeValidationResult => {
  const matches = solveTfeQuestion(question);
  const allViews = [
    ...question.prompt.givenViews.map(({ view }) => view),
    ...question.choices.map(({ view }) => view),
  ];
  const allSegments = allViews.flatMap(({ visible, hidden }) => [...visible, ...hidden]);
  const canonicalFingerprints = question.choices.map(({ view }) =>
    canonicalizeOrthographicView(view.frame, view.visible, view.hidden).fingerprint);
  const checks = [
    check("given-view-count", question.prompt.givenViews.length === 2),
    check("choice-count", question.choices.length === 4),
    check("unique-choices", new Set(canonicalFingerprints).size === 4),
    check("unique-rendered-choices", new Set(question.choices.map(({ svg }) => svg)).size === question.choices.length),
    check("stable-fingerprints", question.choices.every(
      ({ view }, index) => view.fingerprint === canonicalFingerprints[index],
    )),
    check("exactly-one-answer", matches.length === 1),
    check("correct-index", matches[0] === question.correctChoiceIndex),
    check("no-zero-length-lines", allSegments.every((segment) => segmentLength(segment) > EPS.projection)),
    check("renderable-svg", question.prompt.givenViews.every(({ svg }) => svg.startsWith("<svg"))
      && question.choices.every(({ svg }) => svg.startsWith("<svg"))),
  ];
  return { passed: checks.every(({ passed }) => passed), checks, matchingChoiceIndices: matches };
};
