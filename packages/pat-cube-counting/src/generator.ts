import {
  canonicalStringify,
  createRandomSource,
  fingerprint64,
  type JsonValue,
  type RandomSource,
} from "@manipat/core";
import { renderVoxelStructure } from "./render.js";
import { solveCubeStructure } from "./solver.js";
import type { CubeCountingFigure, CubeCountingQuestion } from "./types.js";
import { validateCubeCountingQuestion } from "./validator.js";
import { VoxelStructure } from "./voxel-grid.js";

interface ColumnCoordinate {
  readonly x: number;
  readonly y: number;
}

const columnKey = ({ x, y }: ColumnCoordinate): string => `${x},${y}`;
const PLANAR_DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

const connectedFootprint = (
  random: RandomSource,
  side: number,
  targetColumns: number,
): readonly ColumnCoordinate[] => {
  const center = Math.floor(side / 2);
  const columns = new Map<string, ColumnCoordinate>();
  const start: ColumnCoordinate = { x: center, y: center };
  columns.set(columnKey(start), start);

  for (let step = 1; columns.size < targetColumns; step += 1) {
    const frontier = new Map<string, ColumnCoordinate>();
    for (const column of columns.values()) {
      for (const [dx, dy] of PLANAR_DIRECTIONS) {
        const candidate: ColumnCoordinate = { x: column.x + dx, y: column.y + dy };
        if (candidate.x < 0 || candidate.y < 0 || candidate.x >= side || candidate.y >= side) continue;
        const key = columnKey(candidate);
        if (!columns.has(key)) frontier.set(key, candidate);
      }
    }
    const candidates = [...frontier.values()];
    if (candidates.length === 0) break;
    const picked = random.fork(`footprint-${step}`).pick(candidates);
    columns.set(columnKey(picked), picked);
  }

  return [...columns.values()].sort((a, b) => a.y - b.y || a.x - b.x);
};

/**
 * Build a sparse, connected DAT-style cube assembly.
 *
 * Real cube-counting figures are irregular assemblies with gaps, short runs and
 * a few towers. A dense heightmap creates a terrain silhouette and removes the
 * hidden-support reasoning the subsection is intended to test.
 */
const buildStructure = (seed: string, difficulty: 1 | 2 | 3 | 4 | 5): VoxelStructure => {
  const random = createRandomSource(seed);
  const side = difficulty >= 4 ? 5 : 4;
  const minimumColumns = 6 + difficulty;
  const maximumColumns = Math.min(side * side - 3, 9 + difficulty * 2);
  const targetColumns = random.fork("column-count").int(minimumColumns, maximumColumns);
  const footprint = connectedFootprint(random.fork("footprint"), side, targetColumns);
  const structure = new VoxelStructure();

  const maximumHeight = difficulty <= 1 ? 2 : difficulty <= 3 ? 3 : 4;
  const towerBudget = Math.max(2, Math.round(footprint.length * (0.22 + difficulty * 0.045)));
  const towerKeys = new Set(
    random.fork("tower-columns").shuffle(footprint).slice(0, towerBudget).map(columnKey),
  );

  for (const column of footprint) {
    const local = random.fork(`height-${column.x}-${column.y}`);
    let height = 1;
    if (towerKeys.has(columnKey(column))) {
      height = local.int(2, maximumHeight);
    } else if (difficulty >= 3 && local.float(0, 1) < 0.22) {
      height = 2;
    }
    for (let z = 0; z < height; z += 1) structure.add(column.x, column.y, z);
  }

  return structure;
};

const figureFromStructure = (structure: VoxelStructure): CubeCountingFigure => {
  const cubes = structure.coordinates();
  const fingerprint = fingerprint64(canonicalStringify(cubes as unknown as JsonValue));
  return {
    id: `cube-figure-${fingerprint}`,
    cubes,
    svg: renderVoxelStructure(structure),
    fingerprint,
    paintingConvention: "exposed-except-resting-bottom",
  };
};

export const generateCubeCountingFigure = (
  seed: string,
  difficulty: 1 | 2 | 3 | 4 | 5 = 3,
): CubeCountingFigure => figureFromStructure(buildStructure(seed, difficulty));

const answerChoices = (correct: number, total: number): readonly number[] => {
  const values = [correct];
  for (let delta = 1; values.length < 5; delta += 1) {
    for (const candidate of [correct - delta, correct + delta]) {
      if (candidate >= 0 && candidate <= total && !values.includes(candidate)) values.push(candidate);
      if (values.length === 5) break;
    }
  }
  return values;
};

export const generateCubeCountingSet = (
  seed: string,
  difficulty: 1 | 2 | 3 | 4 | 5 = 3,
  questionCount = 3,
): readonly CubeCountingQuestion[] => {
  let structure: VoxelStructure | undefined;
  let solution: ReturnType<typeof solveCubeStructure> | undefined;
  let eligible: readonly (1 | 2 | 3 | 4 | 5)[] = [];

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = buildStructure(`${seed}:layout-${attempt}`, difficulty);
    const candidateSolution = solveCubeStructure(candidate);
    const candidateEligible = ([1, 2, 3, 4, 5] as const).filter(
      (painted) => (candidateSolution.counts[painted] ?? 0) > 0,
    );
    if (candidateEligible.length >= questionCount) {
      structure = candidate;
      solution = candidateSolution;
      eligible = candidateEligible;
      break;
    }
  }

  if (structure === undefined || solution === undefined) {
    throw new Error("Could not generate a cube structure with enough painted-face categories");
  }

  const figure = figureFromStructure(structure);
  return createRandomSource(seed).fork("targets").shuffle(eligible).slice(0, questionCount).map((target) => {
    const correct = solution.counts[target] ?? 0;
    const choices = createRandomSource(seed).fork(`choices-${target}`).shuffle(answerChoices(correct, structure.size));
    const correctChoiceIndex = choices.indexOf(correct);
    const base: CubeCountingQuestion = {
      id: `${figure.id}-faces-${target}`,
      engineVersion: "0.1.0",
      type: "cube-counting",
      seed,
      templateId: "sparse-supported-columns-v2",
      templateVersion: 2,
      prompt: { figure, targetPaintedFaces: target },
      choices,
      correctChoiceIndex,
      explanation: {
        type: "cube-counting",
        targetPaintedFaces: target,
        matchingCubes: solution.matchingCubes[target] ?? [],
        count: correct,
      },
      difficulty: {
        raw: difficulty * 10 + structure.size / 5,
        normalized: Math.min(1, (difficulty * 10 + structure.size / 5) / 60),
        band: difficulty,
        components: { cubeCount: structure.size, targetPaintedFaces: target },
      },
      validation: { passed: false, checks: [] },
      fingerprints: { figure: figure.fingerprint },
      metadata: { sharedFigureQuestionCount: questionCount },
    };
    const validation = validateCubeCountingQuestion(base);
    if (!validation.passed) throw new Error("Cube counting question failed validation");
    return { ...base, validation: { passed: true, checks: validation.checks } };
  });
};
