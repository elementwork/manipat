import {
  canonicalStringify,
  createRandomSource,
  fingerprint64,
  type JsonValue,
} from "@manipat/core";
import { renderVoxelStructure } from "./render.js";
import { solveCubeStructure } from "./solver.js";
import type { CubeCountingFigure, CubeCountingQuestion } from "./types.js";
import { validateCubeCountingQuestion } from "./validator.js";
import { VoxelStructure } from "./voxel-grid.js";

const buildStructure = (seed: string, difficulty: 1 | 2 | 3 | 4 | 5): VoxelStructure => {
  const random = createRandomSource(seed);
  const side = difficulty >= 4 ? 4 : 3;
  const structure = new VoxelStructure();
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const gradient = Math.max(1, 1 + difficulty - Math.floor((x + y) / 2));
      const height = Math.min(5, gradient + random.fork(`column-${x}-${y}`).int(0, 1));
      for (let z = 0; z < height; z += 1) structure.add(x, y, z);
    }
  }
  return structure;
};

export const generateCubeCountingFigure = (
  seed: string,
  difficulty: 1 | 2 | 3 | 4 | 5 = 3,
): CubeCountingFigure => {
  const structure = buildStructure(seed, difficulty);
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
  const figure = generateCubeCountingFigure(seed, difficulty);
  const structure = new VoxelStructure(figure.cubes);
  const solution = solveCubeStructure(structure);
  const eligible = ([1, 2, 3, 4, 5] as const).filter((painted) => (solution.counts[painted] ?? 0) > 0);
  if (eligible.length < questionCount) throw new Error("Cube structure has too few nonzero painted-face categories");
  return createRandomSource(seed).fork("targets").shuffle(eligible).slice(0, questionCount).map((target) => {
    const correct = solution.counts[target] ?? 0;
    const choices = createRandomSource(seed).fork(`choices-${target}`).shuffle(answerChoices(correct, structure.size));
    const correctChoiceIndex = choices.indexOf(correct);
    const base: CubeCountingQuestion = {
      id: `${figure.id}-faces-${target}`,
      engineVersion: "0.1.0",
      type: "cube-counting",
      seed,
      templateId: "supported-gradient-heightmap",
      templateVersion: 1,
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
