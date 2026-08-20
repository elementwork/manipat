import {
  canonicalStringify,
  createRandomSource,
  fingerprint64,
  type JsonValue,
  type RandomSource,
  type Vec2,
} from "@manipat/core";
import {
  applyFold,
  createInitialFoldState,
  punchState,
  signedDistanceFromFold,
  unfoldPunches,
} from "./fold.js";
import {
  isSinglePhysicalFoldTransition,
  renderFoldStep,
  renderHolePattern,
  renderOriginalSheet,
} from "./render.js";
import type {
  FoldInstruction,
  FoldState,
  PaperFoldingChoice,
  PaperFoldingQuestion,
} from "./types.js";
import { validatePaperFoldingQuestion } from "./validator.js";

const SQRT_HALF = Math.SQRT1_2;
const FOLD_POOL: readonly FoldInstruction[] = [
  { id: "center-right-left", line: { point: [2, 0], unitDirection: [0, 1] }, movingSide: -1 },
  { id: "center-left-right", line: { point: [2, 0], unitDirection: [0, 1] }, movingSide: 1 },
  { id: "quarter-left-in", line: { point: [1, 0], unitDirection: [0, 1] }, movingSide: 1 },
  { id: "quarter-right-in", line: { point: [3, 0], unitDirection: [0, 1] }, movingSide: -1 },
  { id: "center-top-bottom", line: { point: [0, 2], unitDirection: [1, 0] }, movingSide: 1 },
  { id: "center-bottom-top", line: { point: [0, 2], unitDirection: [1, 0] }, movingSide: -1 },
  { id: "quarter-bottom-in", line: { point: [0, 1], unitDirection: [1, 0] }, movingSide: -1 },
  { id: "quarter-top-in", line: { point: [0, 3], unitDirection: [1, 0] }, movingSide: 1 },
  { id: "diagonal-upper-lower", line: { point: [0, 0], unitDirection: [SQRT_HALF, SQRT_HALF] }, movingSide: 1 },
  { id: "diagonal-lower-upper", line: { point: [0, 0], unitDirection: [SQRT_HALF, SQRT_HALF] }, movingSide: -1 },
  { id: "anti-diagonal-upper-lower", line: { point: [0, 4], unitDirection: [SQRT_HALF, -SQRT_HALF] }, movingSide: 1 },
  { id: "anti-diagonal-lower-upper", line: { point: [0, 4], unitDirection: [SQRT_HALF, -SQRT_HALF] }, movingSide: -1 },
];

const pointKey = ([x, y]: Vec2): string => `${x},${y}`;
const lineKey = ({ line }: FoldInstruction): string =>
  `${line.point[0]},${line.point[1]}:${line.unitDirection[0].toFixed(4)},${line.unitDirection[1].toFixed(4)}`;

const foldCountFor = (random: RandomSource, difficulty: 1 | 2 | 3 | 4 | 5): number => {
  switch (difficulty) {
    case 1: return random.fork("fold-count").int(1, 2);
    case 2: return 2;
    case 3: return random.fork("fold-count").int(2, 3);
    case 4:
    case 5:
      return 3;
    default:
      return difficulty satisfies never;
  }
};

const occupiedPositions = (state: FoldState): number =>
  new Set(state.layers.map(({ currentCenter }) => pointKey(currentCenter))).size;

const validFold = (state: FoldState, instruction: FoldInstruction): boolean => {
  const distances = state.layers.map(({ currentCenter }) => signedDistanceFromFold(currentCenter, instruction.line));
  const moving = distances.filter((distance) => Math.abs(distance) > 0.1 && Math.sign(distance) === instruction.movingSide).length;
  const stationary = distances.filter((distance) => Math.abs(distance) <= 0.1 || Math.sign(distance) !== instruction.movingSide).length;
  if (moving === 0 || stationary === 0) return false;
  if (!isSinglePhysicalFoldTransition(state.folds, instruction)) return false;
  const next = applyFold(state, instruction);
  if (next.layers.some(({ currentCenter: [x, y] }) => x < 0.5 || x > 3.5 || y < 0.5 || y > 3.5)) return false;
  return occupiedPositions(next) < occupiedPositions(state);
};

const tryCreateFoldProgram = (
  random: RandomSource,
  difficulty: 1 | 2 | 3 | 4 | 5,
): readonly FoldInstruction[] | undefined => {
  const count = foldCountFor(random, difficulty);
  let state = createInitialFoldState();
  const usedLines = new Set<string>();
  const folds: FoldInstruction[] = [];
  for (let step = 0; step < count; step += 1) {
    const candidates = FOLD_POOL.filter((candidate) =>
      !usedLines.has(lineKey(candidate)) && validFold(state, candidate));
    if (candidates.length === 0) return undefined;
    const selected = random.fork(`fold-${step}`).pick(candidates);
    folds.push(selected);
    usedLines.add(lineKey(selected));
    state = applyFold(state, selected);
  }
  return folds;
};

interface SelectedFoldProgram {
  readonly folds: readonly FoldInstruction[];
  readonly folded: FoldState;
  readonly locations: readonly Vec2[];
}

const selectFoldProgram = (
  random: RandomSource,
  difficulty: 1 | 2 | 3 | 4 | 5,
): SelectedFoldProgram => {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const folds = tryCreateFoldProgram(random.fork(`program-${attempt}`), difficulty);
    if (folds === undefined) continue;
    const folded = folds.reduce(applyFold, createInitialFoldState());
    const locations = [...new Map(folded.layers.map(({ currentCenter }) => [
      pointKey(currentCenter),
      currentCenter,
    ])).values()].filter((point) => folds.every(({ line }) =>
      Math.abs(signedDistanceFromFold(point, line)) > 0.1));
    if (locations.length > 0) return { folds, folded, locations };
  }
  throw new Error("Could not construct a state-valid fold program with an unambiguous punch location");
};

const patternFingerprint = (holes: readonly Vec2[]): string =>
  fingerprint64(canonicalStringify(holes as unknown as JsonValue));

const allGridPoints = (): readonly Vec2[] => Array.from({ length: 16 }, (_, index) => [
  index % 4 + 0.5,
  Math.floor(index / 4) + 0.5,
]);

const patternDistance = (first: readonly Vec2[], second: readonly Vec2[]): number => {
  const a = new Set(first.map(pointKey));
  const b = new Set(second.map(pointKey));
  let difference = 0;
  for (const key of a) if (!b.has(key)) difference += 1;
  for (const key of b) if (!a.has(key)) difference += 1;
  return difference;
};

const distractorPatterns = (
  correct: readonly Vec2[],
  random: RandomSource,
  difficulty: 1 | 2 | 3 | 4 | 5,
): readonly { holes: readonly Vec2[]; mutation: string }[] => {
  const correctKeys = new Set(correct.map(pointKey));
  const available = allGridPoints().filter((point) => !correctKeys.has(pointKey(point)));
  const candidates: Array<{ holes: readonly Vec2[]; mutation: string }> = [];
  candidates.push({ holes: correct.map(([x, y]): Vec2 => [4 - x, y]), mutation: "wrong-horizontal-symmetry" });
  candidates.push({ holes: correct.map(([x, y]): Vec2 => [x, 4 - y]), mutation: "wrong-vertical-symmetry" });
  candidates.push({ holes: correct.map(([x, y]): Vec2 => [y, x]), mutation: "wrong-diagonal" });
  candidates.push({ holes: correct.map(([x, y]): Vec2 => [4 - y, 4 - x]), mutation: "wrong-anti-diagonal" });
  for (let index = 0; index < correct.length; index += 1) {
    candidates.push({ holes: correct.filter((_, candidateIndex) => candidateIndex !== index), mutation: "missing-reflection" });
    for (let second = index + 1; second < correct.length; second += 1) {
      candidates.push({
        holes: correct.filter((_, candidateIndex) => candidateIndex !== index && candidateIndex !== second),
        mutation: "missing-two-reflections",
      });
    }
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
  const correctFingerprint = patternFingerprint(correct);
  for (const candidate of candidates) {
    const holes = [...new Map(candidate.holes.map((point) => [pointKey(point), point])).values()]
      .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const fingerprint = patternFingerprint(holes);
    if (fingerprint !== correctFingerprint) unique.set(fingerprint, { holes, mutation: candidate.mutation });
  }

  const pool = random.fork("distractor-order").shuffle([...unique.values()]);
  const selected: Array<{ holes: readonly Vec2[]; mutation: string }> = [];
  const selectBest = (minimumCorrectDistance: number): boolean => {
    let best: { holes: readonly Vec2[]; mutation: string } | undefined;
    let bestScore = -1;
    for (const candidate of pool) {
      if (selected.includes(candidate)) continue;
      const fromCorrect = patternDistance(correct, candidate.holes);
      if (fromCorrect < minimumCorrectDistance) continue;
      const fromSelected = selected.length === 0
        ? fromCorrect
        : Math.min(...selected.map(({ holes }) => patternDistance(holes, candidate.holes)));
      const score = Math.min(fromCorrect, fromSelected);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    if (best === undefined) return false;
    selected.push(best);
    return true;
  };

  // The validator intentionally requires at least two meaningfully different
  // alternatives. Satisfy that invariant by construction rather than hoping a
  // diversity-maximizing greedy pass happens to choose two distance-2 options.
  while (selected.length < 2 && selectBest(2)) {
    // Continue until two robust distractors have been admitted.
  }
  if (selected.length < 2) throw new Error("Could not generate two robust paper-folding distractors");

  const minimumCorrectDistance = difficulty >= 4 ? 1 : 2;
  while (selected.length < 4 && selectBest(minimumCorrectDistance)) {
    // Fill the remaining choices at the requested difficulty similarity.
  }
  if (selected.length < 4) throw new Error("Could not generate four diverse paper-folding distractors");
  return selected;
};

export const generatePaperFoldingQuestion = (
  seed: string,
  difficulty: 1 | 2 | 3 | 4 | 5 = 3,
): PaperFoldingQuestion => {
  const random = createRandomSource(seed);
  const { folds, locations } = selectFoldProgram(random.fork("folds"), difficulty);
  const folded = folds.reduce(applyFold, createInitialFoldState());
  const punchCount = difficulty >= 4 && locations.length > 1 ? 2 : 1;
  const punches = random.fork("punches").shuffle(locations).slice(0, punchCount);
  const punched = punchState(folded, punches);
  const correctHoles = unfoldPunches(punched);
  const correctFingerprint = patternFingerprint(correctHoles);
  const rawChoices = [
    { holes: correctHoles, fingerprint: correctFingerprint },
    ...distractorPatterns(correctHoles, random.fork("distractors"), difficulty).map(({ holes, mutation }) => ({
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
    templateId: `state-valid-${folds.map(({ id }) => id).join("-")}`,
    templateVersion: 3,
    prompt: {
      folds,
      punches,
      originalSvg: renderOriginalSheet(),
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
    metadata: { gridSize: 4, layerCount: 16, foldModel: "state-valid-v3-single-physical-fold" },
  };
  const validation = validatePaperFoldingQuestion(base);
  if (!validation.passed) throw new Error(`Paper folding validation failed: ${validation.checks.filter(({ passed }) => !passed).map(({ id }) => id).join(", ")}`);
  return { ...base, validation: { passed: true, checks: validation.checks } };
};
