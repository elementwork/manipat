import type { Vec2 } from "@manipat/core";
import type { AngleItem, AngleQuestion } from "./types.js";

const vector = (from: Vec2, to: Vec2): Vec2 => [to[0] - from[0], to[1] - from[1]];

export const measureAngleDegrees = (item: AngleItem): number => {
  const a = vector(item.vertex, item.rayA);
  const b = vector(item.vertex, item.rayB);
  const magnitude = Math.hypot(...a) * Math.hypot(...b);
  if (magnitude === 0) throw new RangeError("Angle rays must have positive length");
  const cosine = Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / magnitude));
  return Math.acos(cosine) * 180 / Math.PI;
};

export const rankAngles = (items: readonly AngleItem[]): readonly number[] =>
  [...items]
    .sort((first, second) => measureAngleDegrees(first) - measureAngleDegrees(second))
    .map(({ id }) => id);

export const solveAngleQuestion = (question: AngleQuestion): readonly number[] => {
  const correct = rankAngles(question.prompt.items);
  return question.choices.flatMap(({ order }, index) =>
    order.every((id, rank) => id === correct[rank]) ? [index] : []);
};
