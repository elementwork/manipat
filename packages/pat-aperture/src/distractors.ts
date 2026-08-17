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

interface AffineMutation {
  readonly reason: ApertureDistractorReason;
  readonly transform: (point: Vec2, center: Vec2) => Vec2;
}

interface PolygonMutation {
  readonly reason: ApertureDistractorReason;
  readonly apply: (silhouette: CanonicalSection2D) => CanonicalSection2D;
}

/*
 * Aperture distractors must physically reject the target projection. Keep the
 * affine pool focused on subtle narrowing/distortion; outward-only scaling is
 * intentionally excluded because a larger copy of the correct aperture would
 * still allow the object to pass.
 */
const AFFINE_MUTATIONS: readonly AffineMutation[] = [
  {
    reason: { type: "too-narrow", details: { axis: "x", factor: 0.88 } },
    transform: ([x, y], [cx]): Vec2 => [cx + (x - cx) * 0.88, y],
  },
  {
    reason: { type: "too-narrow", details: { axis: "y", factor: 0.88 } },
    transform: ([x, y], [, cy]): Vec2 => [x, cy + (y - cy) * 0.88],
  },
  {
    reason: { type: "too-narrow", details: { axes: "xy", factor: 0.9 } },
    transform: ([x, y], [cx, cy]): Vec2 => [cx + (x - cx) * 0.9, cy + (y - cy) * 0.9],
  },
  {
    reason: { type: "wrong-position", details: { mutation: "horizontal-shear", factor: 0.22 } },
    transform: ([x, y], [, cy]): Vec2 => [x + (y - cy) * 0.22, y],
  },
  {
    reason: { type: "wrong-position", details: { mutation: "vertical-shear", factor: 0.22 } },
    transform: ([x, y], [cx]): Vec2 => [x, y + (x - cx) * 0.22],
  },
  {
    reason: { type: "wrong-projection", details: { mutation: "rotated-90" } },
    transform: ([x, y], [cx, cy]): Vec2 => [cx - (y - cy), cy + (x - cx)],
  },
];

const longestEdgeIndex = (polygon: readonly Vec2[]): number => {
  let best = 0;
  let bestLen = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const next = polygon[(i + 1) % polygon.length]!;
    const curr = polygon[i]!;
    const len = Math.hypot(next[0] - curr[0], next[1] - curr[1]);
    if (len > bestLen) { bestLen = len; best = i; }
  }
  return best;
};

const centroid = (polygon: readonly Vec2[]): Vec2 => [
  polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length,
  polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length,
];

const addNotch = (polygon: readonly Vec2[], depthFactor: number): Vec2[] => {
  const index = longestEdgeIndex(polygon);
  const a = polygon[index]!;
  const b = polygon[(index + 1) % polygon.length]!;
  const midX = (a[0] + b[0]) / 2;
  const midY = (a[1] + b[1]) / 2;
  const center = centroid(polygon);
  const dx = center[0] - midX;
  const dy = center[1] - midY;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-9) return [...polygon];
  const edgeLength = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const depth = edgeLength * depthFactor;
  const notchPoint: Vec2 = [midX + (dx / distance) * depth, midY + (dy / distance) * depth];
  const result = [...polygon];
  result.splice(index + 1, 0, notchPoint);
  return result;
};

const removeVertex = (polygon: readonly Vec2[], index: number): Vec2[] =>
  polygon.filter((_, candidateIndex) => candidateIndex !== index);

const POLYGON_MUTATIONS: readonly PolygonMutation[] = [
  {
    reason: { type: "wrong-concavity", details: { mutation: "add-notch", depth: 0.18 } },
    apply: (silhouette) => {
      const polygon = silhouette.polygons[0];
      if (polygon === undefined) return silhouette;
      return canonicalizeSilhouette({ polygons: [addNotch(polygon, 0.18)], bounds: silhouette.bounds });
    },
  },
  {
    reason: { type: "wrong-concavity", details: { mutation: "add-notch", depth: 0.3 } },
    apply: (silhouette) => {
      const polygon = silhouette.polygons[0];
      if (polygon === undefined) return silhouette;
      return canonicalizeSilhouette({ polygons: [addNotch(polygon, 0.3)], bounds: silhouette.bounds });
    },
  },
  {
    reason: { type: "missing-feature", details: { mutation: "remove-vertex" } },
    apply: (silhouette) => {
      const polygon = silhouette.polygons[0];
      if (polygon === undefined || polygon.length <= 3) return silhouette;
      const index = (longestEdgeIndex(polygon) + 1) % polygon.length;
      return canonicalizeSilhouette({ polygons: [removeVertex(polygon, index)], bounds: silhouette.bounds });
    },
  },
  {
    reason: { type: "wrong-concavity", details: { mutation: "deep-notch", depth: 0.42 } },
    apply: (silhouette) => {
      const polygon = silhouette.polygons[0];
      if (polygon === undefined) return silhouette;
      return canonicalizeSilhouette({ polygons: [addNotch(polygon, 0.42)], bounds: silhouette.bounds });
    },
  },
];

const acceptDistractor = (
  candidate: CanonicalSection2D,
  correct: CanonicalSection2D,
  fingerprints: Set<string>,
): string | undefined => {
  const fingerprint = silhouetteFingerprint(candidate);
  if (fingerprints.has(fingerprint)) return undefined;
  // The correct silhouette is the target object's projected footprint. Any
  // candidate that fully contains it would also be a physically valid opening.
  if (apertureContains(candidate, correct)) return undefined;
  fingerprints.add(fingerprint);
  return fingerprint;
};

export const generateApertureDistractors = (
  correct: CanonicalSection2D,
  count = 4,
): readonly ApertureDistractor[] => {
  const center: Vec2 = [
    (correct.bounds.min[0] + correct.bounds.max[0]) / 2,
    (correct.bounds.min[1] + correct.bounds.max[1]) / 2,
  ];
  const fingerprints = new Set([silhouetteFingerprint(correct)]);
  const distractors: ApertureDistractor[] = [];

  // Interleave shape and affine errors so a typical A–E set does not collapse
  // into four obvious scale variants.
  const candidates: Array<{ silhouette: CanonicalSection2D; reason: ApertureDistractorReason }> = [];
  const maximum = Math.max(AFFINE_MUTATIONS.length, POLYGON_MUTATIONS.length);
  for (let index = 0; index < maximum; index += 1) {
    const polygonMutation = POLYGON_MUTATIONS[index];
    if (polygonMutation !== undefined) {
      candidates.push({ silhouette: polygonMutation.apply(correct), reason: polygonMutation.reason });
    }
    const affineMutation = AFFINE_MUTATIONS[index];
    if (affineMutation !== undefined) {
      candidates.push({
        silhouette: mapSilhouette(correct, (point) => affineMutation.transform(point, center)),
        reason: affineMutation.reason,
      });
    }
  }

  for (const candidate of candidates) {
    const fingerprint = acceptDistractor(candidate.silhouette, correct, fingerprints);
    if (fingerprint === undefined) continue;
    distractors.push({ silhouette: candidate.silhouette, fingerprint, reason: candidate.reason });
    if (distractors.length === count) return distractors;
  }

  throw new Error(`Could not generate ${count} unique physically invalid distractors`);
};
