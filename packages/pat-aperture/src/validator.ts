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

const meaningfullyDifferent = (
  target: CanonicalSection2D,
  candidate: CanonicalSection2D,
): boolean => {
  const targetWidth = target.bounds.max[0] - target.bounds.min[0];
  const targetHeight = target.bounds.max[1] - target.bounds.min[1];
  const candidateWidth = candidate.bounds.max[0] - candidate.bounds.min[0];
  const candidateHeight = candidate.bounds.max[1] - candidate.bounds.min[1];
  const widthDifference = Math.abs(candidateWidth - targetWidth) / Math.max(targetWidth, EPS.length);
  const heightDifference = Math.abs(candidateHeight - targetHeight) / Math.max(targetHeight, EPS.length);
  const targetVertices = target.polygons.reduce((sum, polygon) => sum + polygon.length, 0);
  const candidateVertices = candidate.polygons.reduce((sum, polygon) => sum + polygon.length, 0);
  return widthDifference >= 0.055
    || heightDifference >= 0.055
    || target.polygons.length !== candidate.polygons.length
    || targetVertices !== candidateVertices;
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
    check("meaningful-choice-separation", targetSilhouette !== undefined && question.choices.every(
      ({ silhouette }, index) => index === question.correctChoiceIndex || meaningfullyDifferent(targetSilhouette, silhouette),
    )),
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
