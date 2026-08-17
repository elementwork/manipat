import type { Vec2 } from "@manipat/core";
import { svgDocument, svgPolygon } from "@manipat/svg";
import type { CubeCoordinate, VoxelStructure } from "./voxel-grid.js";

/** Scale factor to convert unit coordinates to pixel-scale coordinates matching golden SVG format. */
const SCALE = 50;
const COS_30 = Math.sqrt(3) / 2;
const project = (x: number, y: number, z: number): Vec2 => [
  (x - y) * COS_30 * SCALE,
  ((x + y) * 0.5 - z) * SCALE,
];

type VisibleFace = "top" | "right" | "front";

const face = (cube: CubeCoordinate, kind: VisibleFace): readonly Vec2[] => {
  const { x, y, z } = cube;
  if (kind === "top") {
    return [
      project(x, y, z + 1),
      project(x + 1, y, z + 1),
      project(x + 1, y + 1, z + 1),
      project(x, y + 1, z + 1),
    ];
  }
  if (kind === "right") {
    return [
      project(x + 1, y, z),
      project(x + 1, y + 1, z),
      project(x + 1, y + 1, z + 1),
      project(x + 1, y, z + 1),
    ];
  }
  return [
    project(x, y, z),
    project(x + 1, y, z),
    project(x + 1, y, z + 1),
    project(x, y, z + 1),
  ];
};

const isExposed = (structure: VoxelStructure, cube: CubeCoordinate, kind: VisibleFace): boolean => {
  const { x, y, z } = cube;
  if (kind === "top") return !structure.has(x, y, z + 1);
  if (kind === "right") return !structure.has(x + 1, y, z);
  // The projected front face is the y-min face.
  return !structure.has(x, y - 1, z);
};

/**
 * Render DAT-style isometric cube-counting line art.
 *
 * Only camera-facing exposed faces are emitted. This prevents internal/shared
 * faces from leaking through the drawing and keeps the result consistent with
 * the monochrome golden references used by the project.
 */
export const renderVoxelStructure = (structure: VoxelStructure): string => {
  const cubes = [...structure.coordinates()].sort((a, b) =>
    (a.x + a.y + a.z) - (b.x + b.y + b.z));
  const attrs = {
    fill: "white",
    stroke: "black",
    "stroke-width": 2,
    "stroke-linejoin": "round",
  } as const;

  const visibleFaces = cubes.flatMap((cube) =>
    (["top", "right", "front"] as const)
      .filter((kind) => isExposed(structure, cube, kind))
      .map((kind) => face(cube, kind)));

  const polygons = visibleFaces.map((polygon) => svgPolygon(polygon, attrs));
  const points = visibleFaces.flat();

  // Empty structures are invalid elsewhere, but keep rendering total and safe.
  if (points.length === 0) {
    return svgDocument({
      viewBox: [-SCALE, -SCALE, SCALE * 2, SCALE * 2],
      title: "Cube counting structure",
      description: "Empty cube counting structure",
      children: [],
    });
  }

  const minX = Math.min(...points.map(([x]) => x));
  const maxX = Math.max(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxY = Math.max(...points.map(([, y]) => y));
  // Include stroke width and enough breathing room to match printed DAT line art.
  const pad = SCALE * 0.2;

  return svgDocument({
    viewBox: [minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2],
    title: "Cube counting structure",
    description: "Isometric stack of identical cubes",
    children: polygons,
  });
};
