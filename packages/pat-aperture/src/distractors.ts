import type { Vec2 } from "@manipat/core";
import {
  canonicalizeSilhouette,
  mapSilhouette,
  silhouetteFingerprint,
  type CanonicalSection2D,
} from "@manipat/geometry";
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

const AFFINE_MUTATIONS: readonly AffineMutation[] = [
  {
    reason: { type: "too-wide", details: { axis: "x", factor: 1.4 } },
    transform: ([x, y], [cx]): Vec2 => [cx + (x - cx) * 1.4, y],
  },
  {
    reason: { type: "too-narrow", details: { axis: "x", factor: 0.65 } },
    transform: ([x, y], [cx]): Vec2 => [cx + (x - cx) * 0.65, y],
  },
  {
    reason: { type: "wrong-projection", details: { mutation: "vertical-scale", factor: 1.4 } },
    transform: ([x, y], [, cy]): Vec2 => [x, cy + (y - cy) * 1.4],
  },
  {
    reason: { type: "wrong-projection", details: { mutation: "vertical-scale", factor: 0.65 } },
    transform: ([x, y], [, cy]): Vec2 => [x, cy + (y - cy) * 0.65],
  },
  {
    reason: { type: "wrong-position", details: { mutation: "horizontal-shear" } },
    transform: ([x, y], [, cy]): Vec2 => [x + (y - cy) * 0.4, y],
  },
  {
    reason: { type: "wrong-position", details: { mutation: "vertical-shear" } },
    transform: ([x, y], [cx]): Vec2 => [x, y + (x - cx) * 0.35],
  },
  {
    reason: { type: "wrong-projection", details: { mutation: "rotated-90" } },
    transform: ([x, y], [cx, cy]): Vec2 => [cx - (y - cy), cy + (x - cx)],
  },
  {
    reason: { type: "wrong-projection", details: { mutation: "rotated-180" } },
    transform: ([x, y], [cx, cy]): Vec2 => [cx - (x - cx), cy - (y - cy)],
  },
  {
    reason: { type: "extra-feature", details: { mutation: "right-bump" } },
    transform: ([x, y], [cx]): Vec2 => [cx + (x - cx) * (x > cx ? 1.45 : 0.7), y],
  },
  {
    reason: { type: "extra-feature", details: { mutation: "top-bump" } },
    transform: ([x, y], [, cy]): Vec2 => [x, cy + (y - cy) * (y > cy ? 1.45 : 0.7)],
  },
];

const longestEdgeIndex = (polygon: readonly Vec2[]): number => {
  let best = 0;
  let bestLen = 0;
  for (let i = 0; i < polygon.length; i++) {
    const next = polygon[(i + 1) % polygon.length]!;
    const curr = polygon[i]!;
    const len = Math.hypot(next[0] - curr[0], next[1] - curr[1]);
    if (len > bestLen) { bestLen = len; best = i; }
  }
  return best;
};

const centroid = (polygon: readonly Vec2[]): Vec2 => [
  polygon.reduce((s, p) => s + p[0], 0) / polygon.length,
  polygon.reduce((s, p) => s + p[1], 0) / polygon.length,
];

const addNotch = (polygon: readonly Vec2[], depthFactor: number): Vec2[] => {
  const idx = longestEdgeIndex(polygon);
  const a = polygon[idx]!;
  const b = polygon[(idx + 1) % polygon.length]!;
  const midX = (a[0] + b[0]) / 2;
  const midY = (a[1] + b[1]) / 2;
  const c = centroid(polygon);
  const dx = c[0] - midX;
  const dy = c[1] - midY;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-9) return [...polygon];
  const edgeLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const depth = edgeLen * depthFactor;
  const notchPt: Vec2 = [midX + (dx / dist) * depth, midY + (dy / dist) * depth];
  const result = [...polygon];
  result.splice(idx + 1, 0, notchPt);
  return result;
};

const addBump = (polygon: readonly Vec2[], depthFactor: number): Vec2[] => {
  const idx = longestEdgeIndex(polygon);
  const a = polygon[idx]!;
  const b = polygon[(idx + 1) % polygon.length]!;
  const midX = (a[0] + b[0]) / 2;
  const midY = (a[1] + b[1]) / 2;
  const c = centroid(polygon);
  const dx = midX - c[0];
  const dy = midY - c[1];
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-9) return [...polygon];
  const edgeLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const depth = edgeLen * depthFactor;
  const bumpPt: Vec2 = [midX + (dx / dist) * depth, midY + (dy / dist) * depth];
  const result = [...polygon];
  result.splice(idx + 1, 0, bumpPt);
  return result;
};

const removeVertex = (polygon: readonly Vec2[], index: number): Vec2[] =>
  polygon.filter((_, i) => i !== index);

const POLYGON_MUTATIONS: readonly PolygonMutation[] = [
  {
    reason: { type: "wrong-concavity", details: { mutation: "add-notch" } },
    apply: (silhouette) => {
      const polygon = silhouette.polygons[0];
      if (polygon === undefined) return silhouette;
      return canonicalizeSilhouette({ polygons: [addNotch(polygon, 0.3)], bounds: silhouette.bounds });
    },
  },
  {
    reason: { type: "extra-feature", details: { mutation: "add-bump" } },
    apply: (silhouette) => {
      const polygon = silhouette.polygons[0];
      if (polygon === undefined) return silhouette;
      return canonicalizeSilhouette({ polygons: [addBump(polygon, 0.3)], bounds: silhouette.bounds });
    },
  },
  {
    reason: { type: "missing-feature", details: { mutation: "remove-vertex" } },
    apply: (silhouette) => {
      const polygon = silhouette.polygons[0];
      if (polygon === undefined || polygon.length <= 3) return silhouette;
      const idx = longestEdgeIndex(polygon);
      const nextIdx = (idx + 1) % polygon.length;
      return canonicalizeSilhouette({ polygons: [removeVertex(polygon, nextIdx)], bounds: silhouette.bounds });
    },
  },
  {
    reason: { type: "wrong-concavity", details: { mutation: "deep-notch" } },
    apply: (silhouette) => {
      const polygon = silhouette.polygons[0];
      if (polygon === undefined) return silhouette;
      return canonicalizeSilhouette({ polygons: [addNotch(polygon, 0.5)], bounds: silhouette.bounds });
    },
  },
  {
    reason: { type: "extra-feature", details: { mutation: "tall-bump" } },
    apply: (silhouette) => {
      const polygon = silhouette.polygons[0];
      if (polygon === undefined) return silhouette;
      return canonicalizeSilhouette({ polygons: [addBump(polygon, 0.5)], bounds: silhouette.bounds });
    },
  },
];

export const generateApertureDistractors = (
  correct: CanonicalSection2D,
  count = 4,
): readonly ApertureDistractor[] => {
  const center: Vec2 = [
    (correct.bounds.min[0] + correct.bounds.max[0]) / 2,
    (correct.bounds.min[1] + correct.bounds.max[1]) / 2,
  ];
  const correctFingerprint = silhouetteFingerprint(correct);
  const fingerprints = new Set([correctFingerprint]);
  const distractors: ApertureDistractor[] = [];

  for (const mutation of AFFINE_MUTATIONS) {
    const silhouette = mapSilhouette(correct, (point) => mutation.transform(point, center));
    const fingerprint = silhouetteFingerprint(silhouette);
    if (fingerprints.has(fingerprint)) continue;
    fingerprints.add(fingerprint);
    distractors.push({ silhouette, fingerprint, reason: mutation.reason });
    if (distractors.length === count) return distractors;
  }

  for (const mutation of POLYGON_MUTATIONS) {
    const silhouette = mutation.apply(correct);
    const fingerprint = silhouetteFingerprint(silhouette);
    if (fingerprints.has(fingerprint)) continue;
    fingerprints.add(fingerprint);
    distractors.push({ silhouette, fingerprint, reason: mutation.reason });
    if (distractors.length === count) return distractors;
  }

  throw new Error(`Could not generate ${count} unique controlled distractors`);
};
