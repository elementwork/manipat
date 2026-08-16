import { EPS, type Vec2 } from "@manipat/core";
import {
  silhouetteFingerprint,
  type CanonicalSection2D,
} from "@manipat/geometry";
import type { ApertureQuestion } from "./types.js";

export const solveExactAperture = (question: ApertureQuestion): readonly number[] =>
  question.choices.flatMap((choice, index) =>
    silhouetteFingerprint(choice.silhouette) === question.prompt.targetSilhouetteFingerprint
      ? [index]
      : [],
  );

const pointOnSegment = (point: Vec2, a: Vec2, b: Vec2, tolerance: number): boolean => {
  const cross = (point[0] - a[0]) * (b[1] - a[1]) - (point[1] - a[1]) * (b[0] - a[0]);
  if (Math.abs(cross) > tolerance) return false;
  const dot = (point[0] - a[0]) * (b[0] - a[0]) + (point[1] - a[1]) * (b[1] - a[1]);
  const squaredLength = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
  return dot >= -tolerance && dot <= squaredLength + tolerance;
};

const pointInPolygon = (
  point: Vec2,
  polygon: readonly Vec2[],
  tolerance: number,
): boolean => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[index];
    const b = polygon[previous];
    if (a === undefined || b === undefined) continue;
    if (pointOnSegment(point, a, b, tolerance)) return true;
    const crosses = (a[1] > point[1]) !== (b[1] > point[1])
      && point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0];
    if (crosses) inside = !inside;
  }
  return inside;
};

/** Initial containment check; exact matching remains the default generation mode. */
export const apertureContains = (
  opening: CanonicalSection2D,
  projectedObject: CanonicalSection2D,
  tolerance = EPS.projection,
): boolean => {
  const openingPolygon = opening.polygons[0];
  const objectPolygon = projectedObject.polygons[0];
  if (openingPolygon === undefined || objectPolygon === undefined) return false;
  return objectPolygon.every((point) => pointInPolygon(point, openingPolygon, tolerance));
};
