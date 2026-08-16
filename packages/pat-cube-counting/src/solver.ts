import type { CubeCoordinate } from "./voxel-grid.js";
import type { VoxelStructure } from "./voxel-grid.js";

export interface CubeCountSolution {
  readonly counts: Readonly<Record<number, number>>;
  readonly matchingCubes: Readonly<Record<number, readonly CubeCoordinate[]>>;
}

export const solveCubeStructure = (structure: VoxelStructure): CubeCountSolution => {
  const matching = new Map<number, CubeCoordinate[]>();
  for (const cube of structure.coordinates()) {
    const painted = structure.exposedFaceCount(cube.x, cube.y, cube.z);
    const cubes = matching.get(painted) ?? [];
    cubes.push(cube);
    matching.set(painted, cubes);
  }
  return {
    counts: Object.fromEntries(Array.from({ length: 6 }, (_, painted) => [painted, matching.get(painted)?.length ?? 0])),
    matchingCubes: Object.fromEntries(Array.from({ length: 6 }, (_, painted) => [painted, matching.get(painted) ?? []])),
  };
};
