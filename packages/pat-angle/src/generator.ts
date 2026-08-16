import {
  canonicalStringify,
  createRandomSource,
  fingerprint64,
  type JsonValue,
  type Vec2,
} from "@manipat/core";
import { renderAnglePrompt } from "./render.js";
import { measureAngleDegrees, rankAngles } from "./solver.js";
import type { AngleChoice, AngleItem, AngleQuestion } from "./types.js";
import { validateAngleQuestion } from "./validator.js";

const MINIMUM_GAP: Readonly<Record<1 | 2 | 3 | 4 | 5, number>> = {
  1: 8,
  2: 4,
  3: 2.5,
  4: 1.25,
  5: 0.5,
};

const endpoint = (vertex: Vec2, degrees: number, length: number): Vec2 => {
  const radians = degrees * Math.PI / 180;
  return [vertex[0] + Math.cos(radians) * length, vertex[1] + Math.sin(radians) * length];
};

const adjacentSwap = (order: readonly number[], index: number): readonly number[] => {
  const result = [...order];
  [result[index], result[index + 1]] = [result[index + 1]!, result[index]!];
  return result;
};

export const generateAngleQuestion = (
  seed: string,
  difficulty: 1 | 2 | 3 | 4 | 5 = 3,
): AngleQuestion => {
  const random = createRandomSource(seed);
  const gap = MINIMUM_GAP[difficulty] + random.fork("angles").float(0.05, MINIMUM_GAP[difficulty] * 0.3);
  const start = random.fork("angles-start").float(24, 118 - gap * 3);
  const measures = Array.from({ length: 4 }, (_, index) => start + gap * index);
  const shuffledMeasures = random.fork("item-order").shuffle(measures);
  const positions = [[60, 55], [180, 55], [60, 150], [180, 150]] as const;
  const items: AngleItem[] = shuffledMeasures.map((angleDegrees, index) => {
    const itemRandom = random.fork(`item-${index}`);
    const vertex = positions[index] ?? [60, 55];
    const rotationDegrees = itemRandom.float(195, 325);
    const rayLengths: readonly [number, number] = [
      itemRandom.float(28, 48),
      itemRandom.float(28, 48),
    ];
    return {
      id: index + 1,
      vertex,
      rayA: endpoint(vertex, rotationDegrees, rayLengths[0]),
      rayB: endpoint(vertex, rotationDegrees + angleDegrees, rayLengths[1]),
      angleDegrees,
      rotationDegrees,
      rayLengths,
    };
  });
  const correctOrder = rankAngles(items);
  const rawChoices: AngleChoice[] = [
    { order: correctOrder },
    { order: adjacentSwap(correctOrder, 0) },
    { order: adjacentSwap(correctOrder, 1) },
    { order: adjacentSwap(correctOrder, 2) },
  ];
  const choices = random.fork("choice-order").shuffle(rawChoices);
  const correctChoiceIndex = choices.findIndex(({ order }) =>
    order.every((id, index) => id === correctOrder[index]));
  const itemFingerprint = fingerprint64(canonicalStringify(items as unknown as JsonValue));
  const base: AngleQuestion = {
    id: `angle-${itemFingerprint}`,
    engineVersion: "0.1.0",
    type: "angle",
    seed,
    templateId: "angle-ranking-v1",
    templateVersion: 1,
    prompt: { items, svg: renderAnglePrompt(items) },
    choices,
    correctChoiceIndex,
    explanation: {
      type: "angle",
      measuredDegrees: Object.fromEntries(items.map((item) => [String(item.id), measureAngleDegrees(item)])),
      orderSmallestToLargest: correctOrder,
    },
    difficulty: {
      raw: 1 / gap,
      normalized: Math.min(1, 1 / gap),
      band: difficulty,
      components: { minimumGapDegrees: gap },
    },
    validation: { passed: false, checks: [] },
    fingerprints: { items: itemFingerprint },
    metadata: { minimumGapDegrees: gap },
  };
  const validation = validateAngleQuestion(base);
  if (!validation.passed) throw new Error("Generated angle question failed validation");
  return { ...base, validation: { passed: true, checks: validation.checks } };
};
