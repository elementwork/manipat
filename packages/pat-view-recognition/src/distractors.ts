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
  a: [a[0] + (b[0] - a[0]) * 0.18, a[1] + (b[1] - a[1]) * 0.18],
  b: [b[0] - (b[0] - a[0]) * 0.18, b[1] - (b[1] - a[1]) * 0.18],
});

const insideBounds = (segment: Segment2, view: OrthographicView, margin = 0): boolean =>
  [segment.a, segment.b].every(([x, y]) =>
    x >= view.bounds.min[0] - margin && x <= view.bounds.max[0] + margin
      && y >= view.bounds.min[1] - margin && y <= view.bounds.max[1] + margin);

const envelopeTouchCount = (segment: Segment2, view: OrthographicView): number => {
  const span = Math.max(
    view.bounds.max[0] - view.bounds.min[0],
    view.bounds.max[1] - view.bounds.min[1],
    EPS.length,
  );
  const tolerance = span * 0.025;
  return [segment.a, segment.b].reduce((count, [x, y]) => count
    + (Math.abs(x - view.bounds.min[0]) <= tolerance ? 1 : 0)
    + (Math.abs(x - view.bounds.max[0]) <= tolerance ? 1 : 0)
    + (Math.abs(y - view.bounds.min[1]) <= tolerance ? 1 : 0)
    + (Math.abs(y - view.bounds.max[1]) <= tolerance ? 1 : 0), 0);
};

/** Prefer an internal feature line over a silhouette/bounding edge. */
const featureVisibleIndex = (view: OrthographicView): number => {
  const center: Vec2 = [
    (view.bounds.min[0] + view.bounds.max[0]) / 2,
    (view.bounds.min[1] + view.bounds.max[1]) / 2,
  ];
  const span = Math.max(
    view.bounds.max[0] - view.bounds.min[0],
    view.bounds.max[1] - view.bounds.min[1],
    EPS.length,
  );
  let bestIndex = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  view.visible.forEach((segment, index) => {
    const [x, y] = midpoint(segment);
    const centerDistance = Math.hypot(x - center[0], y - center[1]) / span;
    const score = envelopeTouchCount(segment, view) * 4 + centerDistance + length(segment) / span * 0.08;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
};

const featureHiddenIndex = (view: OrthographicView): number => {
  if (view.hidden.length === 0) return -1;
  const center: Vec2 = [
    (view.bounds.min[0] + view.bounds.max[0]) / 2,
    (view.bounds.min[1] + view.bounds.max[1]) / 2,
  ];
  let bestIndex = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  view.hidden.forEach((segment, index) => {
    const [x, y] = midpoint(segment);
    const score = Math.hypot(x - center[0], y - center[1]);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
};

/**
 * Build plausible alternative interpretations of the actual missing view.
 * Never transplant/rescale TOP, FRONT, or END geometry into another view: that
 * produces choices that violate orthographic correspondence and was the source
 * of several visibly malformed answer diagrams.
 */
export const generateTfeDistractors = (
  correct: OrthographicView,
  referenceViews: readonly OrthographicView[] = [],
): readonly TfeDistractor[] => {
  // Retain the second parameter for source/API compatibility while deliberately
  // refusing to transplant those other principal views into the answer box.
  void referenceViews;

  const visible = [...correct.visible];
  const hidden = [...correct.hidden];
  if (visible.length === 0) throw new Error("TFE view has no visible line to mutate");

  const span = Math.max(
    correct.bounds.max[0] - correct.bounds.min[0],
    correct.bounds.max[1] - correct.bounds.min[1],
    EPS.length,
  );
  const center: Vec2 = [
    (correct.bounds.min[0] + correct.bounds.max[0]) / 2,
    (correct.bounds.min[1] + correct.bounds.max[1]) / 2,
  ];
  const featureIndex = featureVisibleIndex(correct);
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

  // A complete left/right reversal is a coherent alternative solid, not a
  // detached line edit, and is common in PAT distractor design.
  add(
    "mirror-view",
    visible.map(({ a, b }) => ({
      a: [2 * center[0] - a[0], a[1]],
      b: [2 * center[0] - b[0], b[1]],
    })),
    hidden.map(({ a, b }) => ({
      a: [2 * center[0] - a[0], a[1]],
      b: [2 * center[0] - b[0], b[1]],
    })),
  );

  // Toggle one internal/recess cue between solid and hidden. Prefer an actual
  // hidden line when available so the outer envelope remains untouched.
  const hiddenIndex = featureHiddenIndex(correct);
  if (hiddenIndex >= 0) {
    const hiddenTarget = hidden[hiddenIndex]!;
    add(
      "visibility-flip",
      [...visible, hiddenTarget],
      hidden.filter((_, index) => index !== hiddenIndex),
    );
  } else {
    add(
      "visibility-flip",
      visible.filter((_, index) => index !== featureIndex),
      [...hidden, target],
    );
  }

  // Move a selected internal feature parallel to itself, but only if the whole
  // segment remains inside the true missing-view envelope.
  const shiftMagnitude = Math.max(EPS.length * 20, span * 0.11);
  const positive = shifted(target, shiftMagnitude);
  const negative = shifted(target, -shiftMagnitude);
  const moved = insideBounds(positive, correct) ? positive : insideBounds(negative, correct) ? negative : undefined;
  if (moved !== undefined) {
    add(
      "move-line",
      visible.map((line, index) => index === featureIndex ? moved : line),
      hidden,
    );
  }

  // Add a parallel internal feature rather than an arbitrary free-floating
  // horizontal line. This keeps the answer visually consistent with the same
  // orthographic envelope and feature orientation.
  const addPositive = shifted(target, Math.max(EPS.length * 20, span * 0.16));
  const addNegative = shifted(target, -Math.max(EPS.length * 20, span * 0.16));
  const newEdge = insideBounds(addPositive, correct)
    ? addPositive
    : insideBounds(addNegative, correct) ? addNegative : undefined;
  if (newEdge !== undefined) add("add-edge", [...visible, newEdge], hidden);

  if (visible.length > 3 && envelopeTouchCount(target, correct) === 0) {
    add("delete-edge", visible.filter((_, index) => index !== featureIndex), hidden);
  }

  // Use shortening only as a later fallback; it can be visually less natural
  // than a coherent shifted/extra feature when the source line is connected.
  add(
    "shorten-line",
    visible.map((line, index) => index === featureIndex ? shortened(line) : line),
    hidden,
  );

  if (results.length < 3) throw new Error("Could not generate three unique coherent TFE distractors");
  return results.slice(0, 3);
};
