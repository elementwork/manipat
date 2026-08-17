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

type VisibleFace = "top" | "x-min" | "y-min";

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
  if (kind === "x-min") {
    return [
      project(x, y, z),
      project(x, y + 1, z),
      project(x, y + 1, z + 1),
      project(x, y, z + 1),
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
  if (kind === "x-min") return !structure.has(x - 1, y, z);
  return !structure.has(x, y - 1, z);
};

const faceDepth = (cube: CubeCoordinate, kind: VisibleFace): number => {
  const x = cube.x + (kind === "x-min" ? 0 : 0.5);
  const y = cube.y + (kind === "y-min" ? 0 : 0.5);
  const z = cube.z + (kind === "top" ? 1 : 0.5);
  // Camera is above the negative-X/negative-Y corner. Larger values are farther
  // along the viewing ray and must be painted first.
  return x + y - z;
};

/**
 * Render DAT-style isometric cube-counting line art from a top-left camera.
 * Opaque exposed polygons are depth-sorted so rear faces are covered by nearer
 * faces, producing closed cubies rather than disconnected 2D parallelograms.
 */
export const renderVoxelStructure = (structure: VoxelStructure): string => {
  const attrs = {
    fill: "white",
    stroke: "black",
    "stroke-width": 2,
    "stroke-linejoin": "round",
  } as const;

  const visibleFaces = structure.coordinates().flatMap((cube) =>
    (["top", "x-min", "y-min"] as const)
      .filter((kind) => isExposed(structure, cube, kind))
      .map((kind) => ({ polygon: face(cube, kind), depth: faceDepth(cube, kind) })))
    .sort((a, b) => b.depth - a.depth);

  const polygons = visibleFaces.map(({ polygon }) => svgPolygon(polygon, attrs));
  const points = visibleFaces.flatMap(({ polygon }) => polygon);

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
  const pad = SCALE * 0.2;

  return svgDocument({
    viewBox: [minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2],
    title: "Cube counting structure",
    description: "Closed isometric stack of identical cubes viewed from above-left",
    children: polygons,
  });
};
