import type { Vec2 } from "@manipat/core";
import { svgDocument, svgPolygon } from "@manipat/svg";
import type { CubeCoordinate } from "./voxel-grid.js";
import type { VoxelStructure } from "./voxel-grid.js";

const COS_30 = Math.sqrt(3) / 2;
const project = (x: number, y: number, z: number): Vec2 => [
  (x - y) * COS_30,
  (x + y) * 0.5 - z,
];

const face = (cube: CubeCoordinate, kind: "top" | "right" | "front"): readonly Vec2[] => {
  const { x, y, z } = cube;
  if (kind === "top") return [project(x, y, z + 1), project(x + 1, y, z + 1), project(x + 1, y + 1, z + 1), project(x, y + 1, z + 1)];
  if (kind === "right") return [project(x + 1, y, z), project(x + 1, y + 1, z), project(x + 1, y + 1, z + 1), project(x + 1, y, z + 1)];
  return [project(x, y, z), project(x + 1, y, z), project(x + 1, y, z + 1), project(x, y, z + 1)];
};

export const renderVoxelStructure = (structure: VoxelStructure): string => {
  const cubes = [...structure.coordinates()].sort((a, b) =>
    (b.x + b.y + b.z) - (a.x + a.y + a.z));
  const polygons = cubes.flatMap((cube) => [
    !structure.has(cube.x, cube.y, cube.z + 1)
      ? svgPolygon(face(cube, "top"), { fill: "#f5f6f8", stroke: "black", "stroke-width": 0.045 })
      : undefined,
    !structure.has(cube.x + 1, cube.y, cube.z)
      ? svgPolygon(face(cube, "right"), { fill: "#cfd5dd", stroke: "black", "stroke-width": 0.045 })
      : undefined,
    !structure.has(cube.x, cube.y - 1, cube.z)
      ? svgPolygon(face(cube, "front"), { fill: "#e1e5ea", stroke: "black", "stroke-width": 0.045 })
      : undefined,
  ].filter((polygon) => polygon !== undefined));
  const points = structure.coordinates().flatMap(({ x, y, z }) => [
    project(x, y, z), project(x + 1, y + 1, z + 1),
  ]);
  const minX = Math.min(...points.map(([x]) => x));
  const maxX = Math.max(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxY = Math.max(...points.map(([, y]) => y));
  return svgDocument({
    viewBox: [minX - 0.5, minY - 0.5, maxX - minX + 1, maxY - minY + 1],
    title: "Cube counting structure",
    description: "Isometric stack of identical cubes",
    children: polygons,
  });
};
