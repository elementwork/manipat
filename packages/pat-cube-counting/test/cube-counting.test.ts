import { createVoxelInstancedRender } from "@manipat/renderer-three";
import { describe, expect, it } from "vitest";
import {
  VoxelStructure,
  generateCubeCountingSet,
  renderVoxelStructure,
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

  it("renders one cube with the front vertical corner below the top diamond", () => {
    const single = new VoxelStructure([{ x: 0, y: 0, z: 0 }]);
    const svg = renderVoxelStructure(single);
    expect(svg.match(/<polygon\b/gu)).toHaveLength(3);
    // project(1, 1, 0) = (0, 50): this is the lower front corner shared by
    // x-max/y-max. The old rear-face renderer never reached this point.
    expect(svg).toContain("0,50");
    expect(svg).toContain("Closed isometric stack");
  });

  it("culls a shared side while retaining the closed surface of adjacent cubes", () => {
    const pair = new VoxelStructure([
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    ]);
    const svg = renderVoxelStructure(pair);
    expect(svg.match(/<polygon\b/gu)).toHaveLength(5);
  });

  it("generates sparse shared figures with three valid questions", () => {
    for (let index = 0; index < 1_000; index += 1) {
      const questions = generateCubeCountingSet(`cubes-${index}`, ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5);
      expect(questions).toHaveLength(3);
      expect(new Set(questions.map(({ prompt }) => prompt.figure.id)).size).toBe(1);
      const first = questions[0]!;
      expect(Number(first.metadata.footprintDensity)).toBeLessThanOrEqual(0.9);
      expect(Number(first.metadata.footprintColumns)).toBeLessThan(Number(first.metadata.footprintBoundingArea));
      expect(Number(first.metadata.distinctColumnHeights)).toBeGreaterThanOrEqual(2);
      for (const question of questions) {
        const validation = validateCubeCountingQuestion(question);
        expect(validation.passed).toBe(true);
        expect(validation.matchingChoiceIndices).toEqual([question.correctChoiceIndex]);
      }
    }
  }, 60_000);

  it("builds one Three.js instance per voxel", () => {
    const structure = new VoxelStructure([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }]);
    using render = createVoxelInstancedRender(structure.centers());
    expect(render.mesh.count).toBe(2);
  });
});
