import { EPS, type ValidationCheck } from "@manipat/core";
import {
  signedPolygonArea,
  silhouetteFingerprint,
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

export const validateApertureQuestion = (
  question: ApertureQuestion,
): ApertureValidationResult => {
  const matchingChoiceIndices = solveExactAperture(question);
  const recomputedFingerprints = question.choices.map((choice) =>
    silhouetteFingerprint(choice.silhouette));
  const uniqueFingerprints = new Set(recomputedFingerprints);
  const targetChoice = question.choices[question.correctChoiceIndex];
  const targetPolygon = targetChoice?.silhouette.polygons[0];
  const area = targetPolygon === undefined ? 0 : Math.abs(signedPolygonArea(targetPolygon));
  const vertexCount = targetPolygon?.length ?? 0;
  const checks: ValidationCheck[] = [
    check("choice-count", question.choices.length === 5, { actual: question.choices.length }),
    check("stored-fingerprints", question.choices.every(
      (choice, index) => choice.fingerprint === recomputedFingerprints[index],
    )),
    check("unique-choices", uniqueFingerprints.size === question.choices.length),
    check("exactly-one-match", matchingChoiceIndices.length === 1, { matchingChoiceIndices }),
    check("correct-index", matchingChoiceIndices[0] === question.correctChoiceIndex),
    check("meaningful-area", area > EPS.area, { area }),
    check("bounded-complexity", vertexCount >= 3 && vertexCount <= 100, { vertexCount }),
    check("renderable-svg", question.choices.every((choice) => choice.svg.startsWith("<svg"))),
  ];
  return {
    passed: checks.every(({ passed }) => passed),
    checks,
    matchingChoiceIndices,
  };
};
