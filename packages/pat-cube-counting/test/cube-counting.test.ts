import { createVoxelInstancedRender } from "@manipat/renderer-three";
import { describe, expect, it } from "vitest";
import {
  VoxelStructure,
  generateCubeCountingSet,
  validateCubeCountingQuestion,
} from "../src/index.js";

describe("cube counting", () => {
  it("applies the unpainted resting-bottom convention", () => {
    const single = new VoxelStructure([{ x: 0, y: 0, z: 0 }]);
    expect(single.exposedFaceCount(0, 0, 0)).toBe(5);
    single.add(0, 0, 1);
    expect(single.exposedFaceCount(0, 0, 0)).toBe(4);
    expect(single.exposedFaceCount(0, 0, 1)).toBe(5);
  });

  it("generates shared figures with three valid questions", () => {
    for (let index = 0; index < 1_000; index += 1) {
      const questions = generateCubeCountingSet(`cubes-${index}`, ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5);
      expect(questions).toHaveLength(3);
      expect(new Set(questions.map(({ prompt }) => prompt.figure.id)).size).toBe(1);
      for (const question of questions) {
        expect(validateCubeCountingQuestion(question).matchingChoiceIndices).toEqual([question.correctChoiceIndex]);
      }
    }
  }, 60_000);

  it("builds one Three.js instance per voxel", () => {
    const structure = new VoxelStructure([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }]);
    using render = createVoxelInstancedRender(structure.centers());
    expect(render.mesh.count).toBe(2);
  });
});
