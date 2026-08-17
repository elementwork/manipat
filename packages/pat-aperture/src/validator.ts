import { EPS, type ValidationCheck, type Vec2 } from "@manipat/core";
import {
  signedPolygonArea,
  silhouetteFingerprint,
  type CanonicalSection2D,
} from "@manipat/geometry";
import { solveExactAperture } from "./solver.js";
import type { ApertureQuestion, ApertureValidationResult } from "./types.js";

const check = (
  id: string,
  passed: boolean,
  details?: Readonly<Record<string, unknown>>,
): ValidationCheck => details === undefined
  ? { id, passed, severity: "error" }
  : { id, passed, severity: "error", details };

const concavityCount = (polygon: readonly Vec2[]): number => polygon.reduce(
  (count, point, index) => {
    const previous = polygon[(index - 1 + polygon.length) % polygon.length];
    const next = polygon[(index + 1) % polygon.length];
    if (previous === undefined || next === undefined) return count;
    const cross = (point[0] - previous[0]) * (next[1] - point[1])
      - (point[1] - previous[1]) * (next[0] - point[0]);
    return count + (cross < 0 ? 1 : 0);
  },
  0,
);

const complexity = (silhouette: CanonicalSection2D): number => {
  const outer = silhouette.polygons[0] ?? [];
  return outer.length + concavityCount(outer) * 2 + Math.max(0, silhouette.polygons.length - 1) * 4;
};

const pointDistance = (a: Vec2, b: Vec2): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
const contourDistance = (first: CanonicalSection2D, second: CanonicalSection2D): number => {
  const a = first.polygons[0] ?? [];
  const b = second.polygons[0] ?? [];
  if (a.length === 0 || b.length === 0) return Number.POSITIVE_INFINITY;
  const scale = Math.max(
    first.bounds.max[0] - first.bounds.min[0],
    first.bounds.max[1] - first.bounds.min[1],
    second.bounds.max[0] - second.bounds.min[0],
    second.bounds.max[1] - second.bounds.min[1],
    EPS.length,
  );
  const directed = (source: readonly Vec2[], target: readonly Vec2[]): number =>
    Math.max(...source.map((point) => Math.min(...target.map((candidate) => pointDistance(point, candidate))))) / scale;
  return Math.max(directed(a, b), directed(b, a));
};

const meaningfullyDifferent = (
  first: CanonicalSection2D,
  second: CanonicalSection2D,
): boolean => {
  const firstWidth = first.bounds.max[0] - first.bounds.min[0];
  const firstHeight = first.bounds.max[1] - first.bounds.min[1];
  const secondWidth = second.bounds.max[0] - second.bounds.min[0];
  const secondHeight = second.bounds.max[1] - second.bounds.min[1];
  const widthDifference = Math.abs(secondWidth - firstWidth) / Math.max(firstWidth, secondWidth, EPS.length);
  const heightDifference = Math.abs(secondHeight - firstHeight) / Math.max(firstHeight, secondHeight, EPS.length);
  const firstVertices = first.polygons.reduce((sum, polygon) => sum + polygon.length, 0);
  const secondVertices = second.polygons.reduce((sum, polygon) => sum + polygon.length, 0);
  return widthDifference >= 0.05
    || heightDifference >= 0.05
    || first.polygons.length !== second.polygons.length
    || firstVertices !== secondVertices
    || contourDistance(first, second) >= 0.045;
};

const choicesAreSeparated = (question: ApertureQuestion): boolean => {
  for (let first = 0; first < question.choices.length; first += 1) {
    for (let second = first + 1; second < question.choices.length; second += 1) {
      const a = question.choices[first]?.silhouette;
      const b = question.choices[second]?.silhouette;
      if (a === undefined || b === undefined || !meaningfullyDifferent(a, b)) return false;
    }
  }
  return true;
};

export const validateApertureQuestion = (
  question: ApertureQuestion,
): ApertureValidationResult => {
  const matchingChoiceIndices = solveExactAperture(question);
  const recomputedFingerprints = question.choices.map((choice) =>
    silhouetteFingerprint(choice.silhouette));
  const uniqueFingerprints = new Set(recomputedFingerprints);
  const targetChoice = question.choices[question.correctChoiceIndex];
  const targetSilhouette = targetChoice?.silhouette;
  const targetPolygon = targetSilhouette?.polygons[0];
  const area = targetPolygon === undefined ? 0 : Math.abs(signedPolygonArea(targetPolygon));
  const vertexCount = targetPolygon?.length ?? 0;
  const targetComplexity = targetSilhouette === undefined ? 0 : complexity(targetSilhouette);
  const minimumComplexity = ({ 1: 4, 2: 5, 3: 6, 4: 6, 5: 6 } as const)[question.difficulty.band];
  const checks: ValidationCheck[] = [
    check("choice-count", question.choices.length === 5, { actual: question.choices.length }),
    check("stored-fingerprints", question.choices.every(
      (choice, index) => choice.fingerprint === recomputedFingerprints[index],
    )),
    check("unique-choices", uniqueFingerprints.size === question.choices.length),
    check("pairwise-choice-separation", choicesAreSeparated(question)),
    check("exactly-one-match", matchingChoiceIndices.length === 1, { matchingChoiceIndices }),
    check("correct-index", matchingChoiceIndices[0] === question.correctChoiceIndex),
    check("meaningful-area", area > EPS.area, { area }),
    check("bounded-complexity", vertexCount >= 3 && vertexCount <= 100, { vertexCount }),
    check("exam-complexity", targetComplexity >= minimumComplexity, { targetComplexity, minimumComplexity }),
    check("renderable-svg", question.prompt.pictorialSvg.startsWith("<svg")
      && question.choices.every((choice) => choice.svg.startsWith("<svg"))),
  ];
  return {
    passed: checks.every(({ passed }) => passed),
    checks,
    matchingChoiceIndices,
  };
};
