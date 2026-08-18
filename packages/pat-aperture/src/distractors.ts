import { EPS, type Vec2 } from "@manipat/core";
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

const withOuterPolygon = (
  silhouette: CanonicalSection2D,
  polygon: readonly Vec2[],
): CanonicalSection2D => canonicalizeSilhouette({
  polygons: [polygon, ...silhouette.polygons.slice(1)],
  bounds: silhouette.bounds,
});

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
  return withOuterPolygon(silhouette, changed);
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
  return withOuterPolygon(silhouette, changed);
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

const meaningfullyDifferent = (first: CanonicalSection2D, second: CanonicalSection2D): boolean => {
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

/** Produce coherent wrong openings and choose a pairwise-separated A–E set. */
export const generateApertureDistractors = (
  correct: CanonicalSection2D,
  validPrincipalProjections: readonly CanonicalSection2D[] = [correct],
  count = 4,
): readonly ApertureDistractor[] => {
  const candidates: Candidate[] = [];

  for (const [index, projection] of validPrincipalProjections.entries()) {
    if (silhouetteFingerprint(projection) === silhouetteFingerprint(correct)) continue;
    candidates.push(
      {
        silhouette: scaleAroundCenter(projection, 0.84, 0.95),
        reason: { type: "wrong-projection", details: { sourceProjection: index, mutation: "too-small-width" } },
      },
      {
        silhouette: scaleAroundCenter(projection, 0.95, 0.83),
        reason: { type: "wrong-projection", details: { sourceProjection: index, mutation: "too-small-height" } },
      },
    );
  }

  // Conservative shrink variants are guaranteed not to admit the true object
  // along the affected dimension. Keeping several separated variants prevents
  // an expensive advanced CSG model from being discarded merely because the
  // more semantic mutations happen to collide for one silhouette.
  for (const [sx, sy] of [
    [0.80, 1.00],
    [1.00, 0.80],
    [0.84, 0.91],
    [0.92, 0.82],
    [0.86, 0.86],
    [0.76, 0.94],
    [0.94, 0.76],
  ] as const) {
    candidates.push({
      silhouette: scaleAroundCenter(correct, sx, sy),
      reason: {
        type: "too-narrow",
        details: { axis: sx === 1 ? "y" : sy === 1 ? "x" : "xy", factorX: sx, factorY: sy },
      },
    });
  }

  candidates.push(
    {
      silhouette: shiftDistinctiveVertex(correct, 0.15),
      reason: { type: "wrong-position", details: { mutation: "shift-distinctive-corner-right" } },
    },
    {
      silhouette: shiftDistinctiveVertex(correct, -0.15),
      reason: { type: "wrong-position", details: { mutation: "shift-distinctive-corner-left" } },
    },
    {
      silhouette: addNotch(correct, 0.22),
      reason: { type: "wrong-concavity", details: { mutation: "added-notch" } },
    },
    {
      silhouette: shear(correct, 0.18),
      reason: { type: "wrong-position", details: { mutation: "skewed-feature-alignment-right" } },
    },
    {
      silhouette: shear(correct, -0.18),
      reason: { type: "wrong-position", details: { mutation: "skewed-feature-alignment-left" } },
    },
  );

  const correctFingerprint = silhouetteFingerprint(correct);
  const fingerprints = new Set([correctFingerprint]);
  const eligible: ApertureDistractor[] = [];
  for (const candidate of candidates) {
    const fingerprint = silhouetteFingerprint(candidate.silhouette);
    if (fingerprints.has(fingerprint)) continue;
    if (validPrincipalProjections.some((projection) => apertureContains(candidate.silhouette, projection))) continue;
    if (!meaningfullyDifferent(correct, candidate.silhouette)) continue;
    fingerprints.add(fingerprint);
    eligible.push({ ...candidate, fingerprint });
  }

  const selected: ApertureDistractor[] = [];
  while (selected.length < count) {
    let best: ApertureDistractor | undefined;
    let bestScore = -1;
    for (const candidate of eligible) {
      if (selected.includes(candidate)) continue;
      if (selected.some(({ silhouette }) => !meaningfullyDifferent(silhouette, candidate.silhouette))) continue;
      const score = selected.length === 0
        ? contourDistance(correct, candidate.silhouette)
        : Math.min(
          contourDistance(correct, candidate.silhouette),
          ...selected.map(({ silhouette }) => contourDistance(silhouette, candidate.silhouette)),
        );
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    if (best === undefined) break;
    selected.push(best);
  }

  if (selected.length < count) {
    throw new Error(`Could not generate ${count} physically invalid, pairwise-separated aperture distractors`);
  }
  return selected;
};