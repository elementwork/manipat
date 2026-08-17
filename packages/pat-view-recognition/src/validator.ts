import { EPS, type Segment2, type ValidationCheck } from "@manipat/core";
import { canonicalizeOrthographicView, type OrthographicView } from "@manipat/geometry";
import { solveTfeQuestion } from "./solver.js";
import type { TfeQuestion, TfeValidationResult } from "./types.js";

const segmentLength = ({ a, b }: Segment2): number => Math.hypot(b[0] - a[0], b[1] - a[1]);
const check = (id: string, passed: boolean): ValidationCheck => ({ id, passed, severity: "error" });
const pointKey = ([x, y]: readonly [number, number]): string => `${x.toFixed(4)},${y.toFixed(4)}`;
const segmentKey = (kind: "v" | "h", { a, b }: Segment2): string => {
  const first = pointKey(a);
  const second = pointKey(b);
  return `${kind}:${first < second ? `${first}|${second}` : `${second}|${first}`}`;
};
const viewKeys = (view: OrthographicView): Set<string> => new Set([
  ...view.visible.map((segment) => segmentKey("v", segment)),
  ...view.hidden.map((segment) => segmentKey("h", segment)),
]);
const viewDifference = (first: OrthographicView, second: OrthographicView): number => {
  const a = viewKeys(first);
  const b = viewKeys(second);
  let difference = 0;
  for (const key of a) if (!b.has(key)) difference += 1;
  for (const key of b) if (!a.has(key)) difference += 1;
  return difference;
};

export const validateTfeQuestion = (question: TfeQuestion): TfeValidationResult => {
  const matches = solveTfeQuestion(question);
  const allViews = [
    ...question.prompt.givenViews.map(({ view }) => view),
    ...question.choices.map(({ view }) => view),
  ];
  const allSegments = allViews.flatMap(({ visible, hidden }) => [...visible, ...hidden]);
  const canonicalFingerprints = question.choices.map(({ view }) =>
    canonicalizeOrthographicView(view.frame, view.visible, view.hidden).fingerprint);
  const correct = question.choices[question.correctChoiceIndex]?.view;
  const choiceDifferences = correct === undefined
    ? []
    : question.choices.flatMap(({ view }, index) =>
      index === question.correctChoiceIndex ? [] : [viewDifference(correct, view)]);
  const mutationTypes = new Set(question.choices.flatMap(({ mutation }, index) =>
    index === question.correctChoiceIndex || mutation === undefined ? [] : [mutation]));
  const targetSegments = correct === undefined ? 0 : correct.visible.length + correct.hidden.length;
  const minimumSegments = question.difficulty.band <= 1 ? 4 : question.difficulty.band <= 3 ? 5 : 6;
  const checks = [
    check("given-view-count", question.prompt.givenViews.length === 2),
    check("choice-count", question.choices.length === 4),
    check("unique-choices", new Set(canonicalFingerprints).size === 4),
    check("unique-rendered-choices", new Set(question.choices.map(({ svg }) => svg)).size === question.choices.length),
    check("structural-choice-separation", choiceDifferences.length === 3 && choiceDifferences.every((difference) => difference >= 2)),
    check("distractor-variety", mutationTypes.size >= 2),
    check("target-information", targetSegments >= minimumSegments),
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
