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
  a: [a[0] + (b[0] - a[0]) * 0.2, a[1] + (b[1] - a[1]) * 0.2],
  b: [b[0] - (b[0] - a[0]) * 0.2, b[1] - (b[1] - a[1]) * 0.2],
});

export const generateTfeDistractors = (
  correct: OrthographicView,
): readonly TfeDistractor[] => {
  const visible = [...correct.visible];
  const hidden = [...correct.hidden];
  const longestVisibleIndex = visible.reduce(
    (best, segment, index) => length(segment) > length(visible[best] ?? segment) ? index : best,
    0,
  );
  const target = visible[longestVisibleIndex];
  if (target === undefined) throw new Error("TFE view has no visible line to mutate");
  const span = Math.max(
    correct.bounds.max[0] - correct.bounds.min[0],
    correct.bounds.max[1] - correct.bounds.min[1],
  );
  const results: TfeDistractor[] = [];
  const fingerprints = new Set([correct.fingerprint]);
  const add = (
    mutation: TfeDistractorMutation,
    candidateVisible: readonly Segment2[],
    candidateHidden: readonly Segment2[],
  ): void => {
    const view = canonicalizeOrthographicView(correct.frame, candidateVisible, candidateHidden);
    if (!fingerprints.has(view.fingerprint)) {
      fingerprints.add(view.fingerprint);
      results.push({ view, mutation });
    }
  };

  add("move-line", visible.map((line, index) =>
    index === longestVisibleIndex ? shifted(line, Math.max(3, span * 0.15)) : line), hidden);
  add("shorten-line", visible.map((line, index) =>
    index === longestVisibleIndex ? shortened(line) : line), hidden);
  add(
    "visibility-flip",
    visible.filter((_, index) => index !== longestVisibleIndex),
    [...hidden, target],
  );
  add(
    "mirror-view",
    visible.map(({ a, b }) => ({ a: [-a[0], a[1]], b: [-b[0], b[1]] })),
    hidden.map(({ a, b }) => ({ a: [-a[0], a[1]], b: [-b[0], b[1]] })),
  );
  if (results.length < 3) throw new Error("Could not generate three unique TFE distractors");
  return results.slice(0, 3);
};
