import type { Vec2 } from "@manipat/core";
import {
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

interface Mutation {
  readonly reason: ApertureDistractorReason;
  readonly transform: (point: Vec2, center: Vec2) => Vec2;
}

const MUTATIONS: readonly Mutation[] = [
  {
    reason: { type: "too-wide", details: { axis: "x", factor: 1.2 } },
    transform: ([x, y], [cx]): Vec2 => [cx + (x - cx) * 1.2, y],
  },
  {
    reason: { type: "too-narrow", details: { axis: "x", factor: 0.8 } },
    transform: ([x, y], [cx]): Vec2 => [cx + (x - cx) * 0.8, y],
  },
  {
    reason: { type: "wrong-position", details: { mutation: "horizontal-shear" } },
    transform: ([x, y], [, cy]): Vec2 => [x + (y - cy) * 0.2, y],
  },
  {
    reason: { type: "wrong-projection", details: { mutation: "vertical-scale", factor: 1.25 } },
    transform: ([x, y], [, cy]): Vec2 => [x, cy + (y - cy) * 1.25],
  },
  {
    reason: { type: "wrong-position", details: { mutation: "vertical-shear" } },
    transform: ([x, y], [cx]): Vec2 => [x, y + (x - cx) * 0.18],
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

  for (const mutation of MUTATIONS) {
    const silhouette = mapSilhouette(correct, (point) => mutation.transform(point, center));
    const fingerprint = silhouetteFingerprint(silhouette);
    if (fingerprints.has(fingerprint)) continue;
    fingerprints.add(fingerprint);
    distractors.push({ silhouette, fingerprint, reason: mutation.reason });
    if (distractors.length === count) return distractors;
  }
  throw new Error(`Could not generate ${count} unique controlled distractors`);
};
