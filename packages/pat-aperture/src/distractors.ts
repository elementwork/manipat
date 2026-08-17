import type { Vec2 } from "@manipat/core";
import {
  canonicalizeSilhouette,
  mapSilhouette,
  silhouetteFingerprint,
  type CanonicalSection2D,
} from "@manipat/geometry";
import { apertureContains } from "./solver.js";
import type { ApertureDistractorReason } from "./types.js";

export interface ApertureDistractor {
  readonly silhouette: CanonicalSection2D;
  readonly fingerprint: string;
  readonly reason: ApertureDistractorReason;
}

interface Candidate {
  readonly silhouette: CanonicalSection2D;
  readonly reason: ApertureDistractorReason;
}

const centerOf = (silhouette: CanonicalSection2D): Vec2 => [
  (silhouette.bounds.min[0] + silhouette.bounds.max[0]) / 2,
  (silhouette.bounds.min[1] + silhouette.bounds.max[1]) / 2,
];

const scaleAroundCenter = (
  silhouette: CanonicalSection2D,
  sx: number,
  sy: number,
): CanonicalSection2D => {
  const [cx, cy] = centerOf(silhouette);
  return mapSilhouette(silhouette, ([x, y]): Vec2 => [
    cx + (x - cx) * sx,
    cy + (y - cy) * sy,
  ]);
};

const shear = (
  silhouette: CanonicalSection2D,
  amount: number,
): CanonicalSection2D => {
  const [, cy] = centerOf(silhouette);
  return mapSilhouette(silhouette, ([x, y]): Vec2 => [x + (y - cy) * amount, y]);
};

const longestEdgeIndex = (polygon: readonly Vec2[]): number => {
  let best = 0;
  let bestLength = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index]!;
    const b = polygon[(index + 1) % polygon.length]!;
    const edgeLength = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (edgeLength > bestLength) {
      bestLength = edgeLength;
      best = index;
    }
  }
  return best;
};

const polygonCentroid = (polygon: readonly Vec2[]): Vec2 => [
  polygon.reduce((sum, [x]) => sum + x, 0) / polygon.length,
  polygon.reduce((sum, [, y]) => sum + y, 0) / polygon.length,
];

const addNotch = (silhouette: CanonicalSection2D, depthFactor: number): CanonicalSection2D => {
  const polygon = silhouette.polygons[0];
  if (polygon === undefined || polygon.length < 3) return silhouette;
  const index = longestEdgeIndex(polygon);
  const a = polygon[index]!;
  const b = polygon[(index + 1) % polygon.length]!;
  const midpoint: Vec2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const center = polygonCentroid(polygon);
  const towardCenter: Vec2 = [center[0] - midpoint[0], center[1] - midpoint[1]];
  const magnitude = Math.hypot(towardCenter[0], towardCenter[1]);
  if (magnitude < 1e-9) return silhouette;
  const edgeLength = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const notch: Vec2 = [
    midpoint[0] + towardCenter[0] / magnitude * edgeLength * depthFactor,
    midpoint[1] + towardCenter[1] / magnitude * edgeLength * depthFactor,
  ];
  const changed = [...polygon];
  changed.splice(index + 1, 0, notch);
  return canonicalizeSilhouette({ polygons: [changed, ...silhouette.polygons.slice(1)], bounds: silhouette.bounds });
};

const shiftDistinctiveVertex = (
  silhouette: CanonicalSection2D,
  fraction: number,
): CanonicalSection2D => {
  const polygon = silhouette.polygons[0];
  if (polygon === undefined || polygon.length < 4) return silhouette;
  const center = polygonCentroid(polygon);
  let chosen = 0;
  let best = -1;
  polygon.forEach(([x, y], index) => {
    const distance = Math.hypot(x - center[0], y - center[1]);
    if (distance > best) {
      best = distance;
      chosen = index;
    }
  });
  const width = silhouette.bounds.max[0] - silhouette.bounds.min[0];
  const changed = polygon.map((point, index): Vec2 =>
    index === chosen ? [point[0] + width * fraction, point[1]] : point);
  return canonicalizeSilhouette({ polygons: [changed, ...silhouette.polygons.slice(1)], bounds: silhouette.bounds });
};

/**
 * Produce wrong openings that resemble genuine projection mistakes. Exact
 * alternative principal projections are themselves physically valid openings,
 * so they are deliberately made slightly too small before being admitted as
 * distractors. Every candidate is rejected if it contains any known valid
 * principal projection of the object.
 */
export const generateApertureDistractors = (
  correct: CanonicalSection2D,
  validPrincipalProjections: readonly CanonicalSection2D[] = [correct],
  count = 4,
): readonly ApertureDistractor[] => {
  const candidates: Candidate[] = [];

  for (const [index, projection] of validPrincipalProjections.entries()) {
    if (silhouetteFingerprint(projection) === silhouetteFingerprint(correct)) continue;
    candidates.push({
      silhouette: scaleAroundCenter(projection, 0.88, 0.96),
      reason: { type: "wrong-projection", details: { sourceProjection: index, mutation: "too-small-width" } },
    });
    candidates.push({
      silhouette: scaleAroundCenter(projection, 0.96, 0.87),
      reason: { type: "wrong-projection", details: { sourceProjection: index, mutation: "too-small-height" } },
    });
  }

  candidates.push(
    {
      silhouette: scaleAroundCenter(correct, 0.86, 1),
      reason: { type: "too-narrow", details: { axis: "x", factor: 0.86 } },
    },
    {
      silhouette: scaleAroundCenter(correct, 1, 0.86),
      reason: { type: "too-narrow", details: { axis: "y", factor: 0.86 } },
    },
    {
      silhouette: shiftDistinctiveVertex(correct, 0.13),
      reason: { type: "wrong-position", details: { mutation: "shift-distinctive-corner" } },
    },
    {
      silhouette: addNotch(correct, 0.2),
      reason: { type: "wrong-concavity", details: { mutation: "added-notch" } },
    },
    {
      silhouette: shear(correct, 0.16),
      reason: { type: "wrong-position", details: { mutation: "skewed-feature-alignment" } },
    },
  );

  const correctFingerprint = silhouetteFingerprint(correct);
  const fingerprints = new Set([correctFingerprint]);
  const distractors: ApertureDistractor[] = [];
  for (const candidate of candidates) {
    const fingerprint = silhouetteFingerprint(candidate.silhouette);
    if (fingerprints.has(fingerprint)) continue;
    if (validPrincipalProjections.some((projection) => apertureContains(candidate.silhouette, projection))) continue;
    fingerprints.add(fingerprint);
    distractors.push({ ...candidate, fingerprint });
    if (distractors.length === count) return distractors;
  }

  throw new Error(`Could not generate ${count} physically invalid, visually distinct aperture distractors`);
};
