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

const midpoint = ({ a, b }: Segment2): Vec2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

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

const rankedFeatureIndices = (
  segments: readonly Segment2[],
  view: OrthographicView,
): readonly number[] => {
  const center: Vec2 = [
    (view.bounds.min[0] + view.bounds.max[0]) / 2,
    (view.bounds.min[1] + view.bounds.max[1]) / 2,
  ];
  return segments.map((segment, index) => {
    const [x, y] = midpoint(segment);
    return {
      index,
      score: envelopeTouchCount(segment, view) * 100 + Math.hypot(x - center[0], y - center[1]),
    };
  }).sort((a, b) => a.score - b.score).map(({ index }) => index);
};

const mapSegment = (
  segment: Segment2,
  mapper: (point: Vec2) => Vec2,
): Segment2 => ({ a: mapper(segment.a), b: mapper(segment.b) });

/**
 * Generate complete, coherent alternative orthographic drawings. Distractors
 * deliberately avoid local line surgery (shortening, free-floating additions,
 * or shifting one connected segment), because those operations can create open
 * contours and dangling extensions that do not resemble real DAT choices.
 */
export const generateTfeDistractors = (
  correct: OrthographicView,
  referenceViews: readonly OrthographicView[] = [],
): readonly TfeDistractor[] => {
  // Kept for API compatibility. Other principal views are evidence for solving
  // the question, not geometry to stretch into the missing-view answer box.
  void referenceViews;

  const visible = [...correct.visible];
  const hidden = [...correct.hidden];
  if (visible.length === 0) throw new Error("TFE view has no visible line to mutate");

  const center: Vec2 = [
    (correct.bounds.min[0] + correct.bounds.max[0]) / 2,
    (correct.bounds.min[1] + correct.bounds.max[1]) / 2,
  ];
  const results: TfeDistractor[] = [];
  const fingerprints = new Set([correct.fingerprint]);

  const add = (
    mutation: TfeDistractorMutation,
    candidateVisible: readonly Segment2[],
    candidateHidden: readonly Segment2[],
  ): void => {
    const view = canonicalizeOrthographicView(correct.frame, candidateVisible, candidateHidden);
    if (fingerprints.has(view.fingerprint)) return;
    fingerprints.add(view.fingerprint);
    results.push({ view, mutation });
  };

  const transformWholeView = (
    mutation: TfeDistractorMutation,
    mapper: (point: Vec2) => Vec2,
  ): void => add(
    mutation,
    visible.map((segment) => mapSegment(segment, mapper)),
    hidden.map((segment) => mapSegment(segment, mapper)),
  );

  // Whole-view mirror: every connected endpoint moves together, so the result
  // remains a closed orthographic drawing even though the interpretation is wrong.
  transformWholeView("mirror-view", ([x, y]) => [2 * center[0] - x, y]);

  // Toggle a real hidden feature to visible, or a central visible feature to
  // hidden. Geometry and endpoints stay unchanged; only the interpretation of
  // the edge changes, matching the visual grammar of golden TFE distractors.
  const hiddenIndices = rankedFeatureIndices(hidden, correct);
  const visibleIndices = rankedFeatureIndices(visible, correct);
  for (const index of hiddenIndices.slice(0, 2)) {
    const segment = hidden[index];
    if (segment === undefined) continue;
    add(
      "visibility-flip",
      [...visible, segment],
      hidden.filter((_, candidateIndex) => candidateIndex !== index),
    );
  }
  if (hiddenIndices.length === 0) {
    for (const index of visibleIndices.slice(0, 2)) {
      const segment = visible[index];
      if (segment === undefined) continue;
      add(
        "visibility-flip",
        visible.filter((_, candidateIndex) => candidateIndex !== index),
        [...hidden, segment],
      );
    }
  }

  // Whole-view dimensional alternatives preserve every junction and closed
  // outline while creating plausible wrong width/height correspondences.
  transformWholeView("dimension-change", ([x, y]) => [
    center[0] + (x - center[0]) * 0.86,
    y,
  ]);
  transformWholeView("dimension-change", ([x, y]) => [
    x,
    center[1] + (y - center[1]) * 0.86,
  ]);

  // A second coherent mirror is useful for highly symmetric source views where
  // the left/right mirror collapses to the correct fingerprint.
  transformWholeView("mirror-view", ([x, y]) => [x, 2 * center[1] - y]);
  transformWholeView("mirror-view", ([x, y]) => [2 * center[0] - x, 2 * center[1] - y]);

  if (results.length < 3) {
    throw new Error("Could not generate three unique closed TFE distractors");
  }
  return results.slice(0, 3);
};
