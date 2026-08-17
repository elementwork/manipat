import { EPS, type Segment2, type Vec2 } from "@manipat/core";
import {
  canonicalizeOrthographicView,
  type OrthographicView,
} from "@manipat/geometry";
import type { TfeDistractorMutation } from "./types.js";

export interface TfeDistractor {
  readonly view: OrthographicView;
  readonly mutation: TfeDistractorMutation;
}

const length = ({ a, b }: Segment2): number => Math.hypot(b[0] - a[0], b[1] - a[1]);
const midpoint = ({ a, b }: Segment2): Vec2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

const shifted = ({ a, b }: Segment2, amount: number): Segment2 => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const magnitude = Math.hypot(dx, dy);
  const offset: Vec2 = magnitude <= EPS.length
    ? [amount, 0]
    : [-dy / magnitude * amount, dx / magnitude * amount];
  return {
    a: [a[0] + offset[0], a[1] + offset[1]],
    b: [b[0] + offset[0], b[1] + offset[1]],
  };
};

const shortened = ({ a, b }: Segment2): Segment2 => ({
  a: [a[0] + (b[0] - a[0]) * 0.24, a[1] + (b[1] - a[1]) * 0.24],
  b: [b[0] - (b[0] - a[0]) * 0.24, b[1] - (b[1] - a[1]) * 0.24],
});

const transformReferenceToTarget = (
  reference: OrthographicView,
  target: OrthographicView,
): OrthographicView => {
  const sourceWidth = Math.max(EPS.length, reference.bounds.max[0] - reference.bounds.min[0]);
  const sourceHeight = Math.max(EPS.length, reference.bounds.max[1] - reference.bounds.min[1]);
  const targetWidth = Math.max(EPS.length, target.bounds.max[0] - target.bounds.min[0]);
  const targetHeight = Math.max(EPS.length, target.bounds.max[1] - target.bounds.min[1]);
  const sourceCenter: Vec2 = [
    (reference.bounds.min[0] + reference.bounds.max[0]) / 2,
    (reference.bounds.min[1] + reference.bounds.max[1]) / 2,
  ];
  const targetCenter: Vec2 = [
    (target.bounds.min[0] + target.bounds.max[0]) / 2,
    (target.bounds.min[1] + target.bounds.max[1]) / 2,
  ];
  const mapPoint = ([x, y]: Vec2): Vec2 => [
    targetCenter[0] + (x - sourceCenter[0]) * targetWidth / sourceWidth,
    targetCenter[1] + (y - sourceCenter[1]) * targetHeight / sourceHeight,
  ];
  const mapSegment = ({ a, b }: Segment2): Segment2 => ({ a: mapPoint(a), b: mapPoint(b) });
  return canonicalizeOrthographicView(
    target.frame,
    reference.visible.map(mapSegment),
    reference.hidden.map(mapSegment),
  );
};

const centralVisibleIndex = (view: OrthographicView): number => {
  const center: Vec2 = [
    (view.bounds.min[0] + view.bounds.max[0]) / 2,
    (view.bounds.min[1] + view.bounds.max[1]) / 2,
  ];
  let bestIndex = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  view.visible.forEach((segment, index) => {
    const [x, y] = midpoint(segment);
    const centerDistance = Math.hypot(x - center[0], y - center[1]);
    const score = centerDistance + length(segment) * 0.05;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
};

/**
 * Build choices from competing structural interpretations first, then from
 * local line mistakes. Using another real orthographic projection as the basis
 * for a distractor produces a coherent wrong answer; arbitrary edits to one
 * long boundary line tend to create near-duplicate or visibly artificial SVGs.
 */
export const generateTfeDistractors = (
  correct: OrthographicView,
  referenceViews: readonly OrthographicView[] = [],
): readonly TfeDistractor[] => {
  const visible = [...correct.visible];
  const hidden = [...correct.hidden];
  if (visible.length === 0) throw new Error("TFE view has no visible line to mutate");

  const span = Math.max(
    correct.bounds.max[0] - correct.bounds.min[0],
    correct.bounds.max[1] - correct.bounds.min[1],
  );
  const center: Vec2 = [
    (correct.bounds.min[0] + correct.bounds.max[0]) / 2,
    (correct.bounds.min[1] + correct.bounds.max[1]) / 2,
  ];
  const featureIndex = centralVisibleIndex(correct);
  const target = visible[featureIndex] ?? visible[0]!;
  const results: TfeDistractor[] = [];
  const fingerprints = new Set([correct.fingerprint]);
  const addView = (mutation: TfeDistractorMutation, view: OrthographicView): void => {
    if (fingerprints.has(view.fingerprint)) return;
    fingerprints.add(view.fingerprint);
    results.push({ view, mutation });
  };
  const add = (
    mutation: TfeDistractorMutation,
    candidateVisible: readonly Segment2[],
    candidateHidden: readonly Segment2[],
  ): void => addView(
    mutation,
    canonicalizeOrthographicView(correct.frame, candidateVisible, candidateHidden),
  );

  for (const reference of referenceViews) {
    addView("wrong-projection", transformReferenceToTarget(reference, correct));
  }

  add(
    "mirror-view",
    visible.map(({ a, b }) => ({ a: [2 * center[0] - a[0], a[1]], b: [2 * center[0] - b[0], b[1]] })),
    hidden.map(({ a, b }) => ({ a: [2 * center[0] - a[0], a[1]], b: [2 * center[0] - b[0], b[1]] })),
  );

  add(
    "visibility-flip",
    visible.filter((_, index) => index !== featureIndex),
    [...hidden, target],
  );

  add("move-line", visible.map((line, index) =>
    index === featureIndex ? shifted(line, Math.max(2.5, span * 0.16)) : line), hidden);

  add("shorten-line", visible.map((line, index) =>
    index === featureIndex ? shortened(line) : line), hidden);

  if (visible.length > 2) {
    const deleteIndex = (featureIndex + 1) % visible.length;
    add("delete-edge", visible.filter((_, index) => index !== deleteIndex), hidden);
  }

  const edgeLen = Math.max(3, span * 0.28);
  const newEdge: Segment2 = {
    a: [center[0] - edgeLen / 2, center[1] + span * 0.12],
    b: [center[0] + edgeLen / 2, center[1] + span * 0.12],
  };
  add("add-edge", [...visible, newEdge], hidden);

  if (results.length < 3) throw new Error("Could not generate three unique TFE distractors");
  return results.slice(0, 3);
};
