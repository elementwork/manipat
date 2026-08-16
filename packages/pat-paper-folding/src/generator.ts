import {
  canonicalStringify,
  createRandomSource,
  fingerprint64,
  type JsonValue,
  type Vec2,
} from "@manipat/core";
import {
  applyFold,
  createInitialFoldState,
  punchState,
  signedDistanceFromFold,
  unfoldPunches,
} from "./fold.js";
import { renderFoldStep, renderHolePattern } from "./render.js";
import type {
  FoldInstruction,
  PaperFoldingChoice,
  PaperFoldingQuestion,
} from "./types.js";
import { validatePaperFoldingQuestion } from "./validator.js";

const SQRT_HALF = Math.SQRT1_2;
const VERTICAL: FoldInstruction = { id: "vertical", line: { point: [2, 0], unitDirection: [0, 1] }, movingSide: -1 };
const HORIZONTAL: FoldInstruction = { id: "horizontal", line: { point: [0, 2], unitDirection: [1, 0] }, movingSide: 1 };
const DIAGONAL: FoldInstruction = { id: "diagonal", line: { point: [0, 0], unitDirection: [SQRT_HALF, SQRT_HALF] }, movingSide: 1 };
const ANTI_DIAGONAL: FoldInstruction = { id: "anti-diagonal", line: { point: [0, 4], unitDirection: [SQRT_HALF, -SQRT_HALF] }, movingSide: 1 };
const THREE_FOLD_PROGRAMS: readonly (readonly FoldInstruction[])[] = [
  [VERTICAL, HORIZONTAL, DIAGONAL], [VERTICAL, HORIZONTAL, ANTI_DIAGONAL],
  [VERTICAL, DIAGONAL, HORIZONTAL], [VERTICAL, DIAGONAL, ANTI_DIAGONAL],
  [VERTICAL, ANTI_DIAGONAL, HORIZONTAL], [VERTICAL, ANTI_DIAGONAL, DIAGONAL],
  [HORIZONTAL, VERTICAL, DIAGONAL], [HORIZONTAL, VERTICAL, ANTI_DIAGONAL],
  [HORIZONTAL, DIAGONAL, VERTICAL], [HORIZONTAL, DIAGONAL, ANTI_DIAGONAL],
  [HORIZONTAL, ANTI_DIAGONAL, VERTICAL], [HORIZONTAL, ANTI_DIAGONAL, DIAGONAL],
  [DIAGONAL, VERTICAL, HORIZONTAL], [DIAGONAL, VERTICAL, ANTI_DIAGONAL],
  [DIAGONAL, HORIZONTAL, VERTICAL], [DIAGONAL, HORIZONTAL, ANTI_DIAGONAL],
  [DIAGONAL, ANTI_DIAGONAL, VERTICAL], [DIAGONAL, ANTI_DIAGONAL, HORIZONTAL],
  [ANTI_DIAGONAL, VERTICAL, HORIZONTAL], [ANTI_DIAGONAL, VERTICAL, DIAGONAL],
  [ANTI_DIAGONAL, HORIZONTAL, VERTICAL], [ANTI_DIAGONAL, HORIZONTAL, DIAGONAL],
  [ANTI_DIAGONAL, DIAGONAL, VERTICAL], [ANTI_DIAGONAL, DIAGONAL, HORIZONTAL],
];
const PROGRAMS: readonly (readonly FoldInstruction[])[] = [
  [VERTICAL], [HORIZONTAL], [DIAGONAL], [ANTI_DIAGONAL],
  [VERTICAL, HORIZONTAL], [HORIZONTAL, VERTICAL],
  [VERTICAL, DIAGONAL], [HORIZONTAL, ANTI_DIAGONAL],
  ...THREE_FOLD_PROGRAMS,
];

const patternFingerprint = (holes: readonly Vec2[]): string =>
  fingerprint64(canonicalStringify(holes as unknown as JsonValue));

const allGridPoints = (): readonly Vec2[] => Array.from({ length: 16 }, (_, index) => [
  index % 4 + 0.5,
  Math.floor(index / 4) + 0.5,
]);

const distractorPatterns = (correct: readonly Vec2[]): readonly { holes: readonly Vec2[]; mutation: string }[] => {
  const correctKeys = new Set(correct.map(([x, y]) => `${x},${y}`));
  const available = allGridPoints().filter(([x, y]) => !correctKeys.has(`${x},${y}`));
  const candidates: Array<{ holes: readonly Vec2[]; mutation: string }> = [];
  if (correct.length > 1) candidates.push({ holes: correct.slice(0, -1), mutation: "missing-reflection" });
  if (available[0] !== undefined) candidates.push({ holes: [...correct, available[0]], mutation: "extra-reflection" });
  if (available[1] !== undefined) candidates.push({ holes: [available[1], ...correct.slice(1)], mutation: "wrong-quadrant" });
  candidates.push({ holes: correct.map(([x, y]): Vec2 => [4 - x, y]), mutation: "wrong-symmetry" });
  candidates.push({ holes: correct.map(([x, y]): Vec2 => [x, 4 - y]), mutation: "wrong-fold-order" });
  candidates.push({ holes: correct.map(([x, y]): Vec2 => [y, x]), mutation: "wrong-diagonal" });
  for (let index = 0; index < correct.length; index += 1) {
    candidates.push({ holes: correct.filter((_, candidateIndex) => candidateIndex !== index), mutation: "missing-reflection" });
  }
  for (const point of available) {
    candidates.push({ holes: [...correct, point], mutation: "extra-reflection" });
  }
  for (let index = 0; index < correct.length; index += 1) {
    for (const point of available) {
      candidates.push({
        holes: correct.map((hole, candidateIndex) => candidateIndex === index ? point : hole),
        mutation: "shifted-punch",
      });
    }
  }

  const unique = new Map<string, { holes: readonly Vec2[]; mutation: string }>();
  for (const candidate of candidates) {
    const holes = [...new Map(candidate.holes.map((point) => [`${point[0]},${point[1]}`, point])).values()]
      .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const fingerprint = patternFingerprint(holes);
    if (fingerprint !== patternFingerprint(correct)) unique.set(fingerprint, { holes, mutation: candidate.mutation });
  }
  if (unique.size < 4) throw new Error("Could not generate four unique paper-folding distractors");
  return [...unique.values()].slice(0, 4);
};

export const generatePaperFoldingQuestion = (
  seed: string,
  difficulty: 1 | 2 | 3 | 4 | 5 = 3,
): PaperFoldingQuestion => {
  const random = createRandomSource(seed);
  const eligible = PROGRAMS.filter((program) => {
    const targetCount = difficulty <= 2 ? 1 : difficulty <= 4 ? 2 : 3;
    return program.length === targetCount;
  });
  const folds = random.fork("folds").pick(eligible);
  const folded = folds.reduce(applyFold, createInitialFoldState());
  const locations = [...new Map(folded.layers.map(({ currentCenter }) => [
    `${currentCenter[0]},${currentCenter[1]}`,
    currentCenter,
  ])).values()].filter((point) => folds.every(({ line }) =>
    Math.abs(signedDistanceFromFold(point, line)) > 0.1));
  if (locations.length === 0) throw new Error("Fold program has no unambiguous punch locations");
  const punchCount = difficulty >= 4 && locations.length > 1 ? 2 : 1;
  const punches = random.fork("punches").shuffle(locations).slice(0, punchCount);
  const punched = punchState(folded, punches);
  const correctHoles = unfoldPunches(punched);
  const correctFingerprint = patternFingerprint(correctHoles);
  const rawChoices = [
    { holes: correctHoles, fingerprint: correctFingerprint },
    ...distractorPatterns(correctHoles).map(({ holes, mutation }) => ({
      holes,
      mutation,
      fingerprint: patternFingerprint(holes),
    })),
  ];
  const shuffled = random.fork("choice-order").shuffle(rawChoices);
  const choices: PaperFoldingChoice[] = shuffled.map((choice, index) => {
    const common = {
      holes: choice.holes,
      fingerprint: choice.fingerprint,
      svg: renderHolePattern(choice.holes, `Paper folding choice ${String.fromCharCode(65 + index)}`),
    };
    return "mutation" in choice ? { ...common, mutation: choice.mutation } : common;
  });
  const correctChoiceIndex = choices.findIndex(({ fingerprint }) => fingerprint === correctFingerprint);
  const questionFingerprint = fingerprint64(canonicalStringify({ folds, punches } as unknown as JsonValue));
  const base: PaperFoldingQuestion = {
    id: `paper-folding-${questionFingerprint}`,
    engineVersion: "0.1.0",
    type: "paper-folding",
    seed,
    templateId: `fold-program-${folds.map(({ id }) => id).join("-")}`,
    templateVersion: 1,
    prompt: {
      folds,
      punches,
      stepSvgs: Array.from({ length: folds.length + 1 }, (_, step) => renderFoldStep(folds, punches, step)),
    },
    choices,
    correctChoiceIndex,
    explanation: {
      type: "paper-folding",
      unfoldOrder: [...folds].reverse().map(({ id }) => id),
      punchLayers: Object.fromEntries(punched.punches.map(({ id, sourceLayerIds }) => [id, sourceLayerIds])),
      finalHoles: correctHoles,
    },
    difficulty: {
      raw: folds.length * 10 + punches.length * 3 + correctHoles.length,
      normalized: Math.min(1, (folds.length * 10 + punches.length * 3 + correctHoles.length) / 45),
      band: difficulty,
      components: { foldCount: folds.length, punchCount: punches.length, holeCount: correctHoles.length },
    },
    validation: { passed: false, checks: [] },
    fingerprints: { pattern: correctFingerprint, question: questionFingerprint },
    metadata: { gridSize: 4, layerCount: 16 },
  };
  const validation = validatePaperFoldingQuestion(base);
  if (!validation.passed) throw new Error(`Paper folding validation failed: ${validation.checks.filter(({ passed }) => !passed).map(({ id }) => id).join(", ")}`);
  return { ...base, validation: { passed: true, checks: validation.checks } };
};
