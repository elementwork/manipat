import type { Vec2 } from "@manipat/core";
import { svgDocument, svgPolygon } from "@manipat/svg";
import type { CubeCoordinate } from "./voxel-grid.js";
import type { VoxelStructure } from "./voxel-grid.js";

/** Scale factor to convert unit coordinates to pixel-scale coordinates matching golden SVG format. */
const SCALE = 50;
const COS_30 = Math.sqrt(3) / 2;
const project = (x: number, y: number, z: number): Vec2 => [
  (x - y) * COS_30 * SCALE,
  ((x + y) * 0.5 - z) * SCALE,
];

const face = (cube: CubeCoordinate, kind: "top" | "right" | "front"): readonly Vec2[] => {
  const { x, y, z } = cube;
  if (kind === "top") return [project(x, y, z + 1), project(x + 1, y, z + 1), project(x + 1, y + 1, z + 1), project(x, y + 1, z + 1)];
  if (kind === "right") return [project(x + 1, y, z), project(x + 1, y + 1, z), project(x + 1, y + 1, z + 1), project(x + 1, y, z + 1)];
  return [project(x, y, z), project(x + 1, y, z), project(x + 1, y, z + 1), project(x, y, z + 1)];
};

/**
 * Render isometric voxel structure matching the golden DAT format.
 * Coordinates are scaled to pixel-level (viewBox ~200-300px wide)
 * with stroke-width 2px, matching the golden reference SVGs.
 */
export const renderVoxelStructure = (structure: VoxelStructure): string => {
  const cubes = [...structure.coordinates()].sort((a, b) =>
    (b.x + b.y + b.z) - (a.x + a.y + a.z));
  const topAttrs = { fill: "white", stroke: "black", "stroke-width": 2, "stroke-linejoin": "round" } as const;
  const rightAttrs = { fill: "#ccc", stroke: "black", "stroke-width": 2, "stroke-linejoin": "round" } as const;
  const frontAttrs = { fill: "#e0e0e0", stroke: "black", "stroke-width": 2, "stroke-linejoin": "round" } as const;
  // Render ALL 3 visible faces per cube for clear 3D grid structure
  const polygons = cubes.flatMap((cube) => [
    svgPolygon(face(cube, "top"), topAttrs),
    svgPolygon(face(cube, "right"), rightAttrs),
    svgPolygon(face(cube, "front"), frontAttrs),
  ]);
  const points = structure.coordinates().flatMap(({ x, y, z }) => [
    project(x, y, z), project(x + 1, y + 1, z + 1),
  ]);
  const minX = Math.min(...points.map(([x]) => x));
  const maxX = Math.max(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxY = Math.max(...points.map(([, y]) => y));
  const pad = SCALE * 0.5;
  return svgDocument({
    viewBox: [minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2],
    title: "Cube counting structure",
    description: "Isometric stack of identical cubes",
    children: polygons,
  });
};
