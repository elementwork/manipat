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

/**
 * This projection collapses the +X/+Y/+Z viewing ray, so the visible cube
 * planes are top, x-max, and y-max. Using x-min/y-min draws the rear planes;
 * their shared vertical edge projects through the top diamond and makes cubes
 * look open or flat.
 */
type VisibleFace = "top" | "x-max" | "y-max";

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
  if (kind === "x-max") {
    return [
      project(x + 1, y, z),
      project(x + 1, y + 1, z),
      project(x + 1, y + 1, z + 1),
      project(x + 1, y, z + 1),
    ];
  }
  return [
    project(x, y + 1, z),
    project(x + 1, y + 1, z),
    project(x + 1, y + 1, z + 1),
    project(x, y + 1, z + 1),
  ];
};

const isExposed = (structure: VoxelStructure, cube: CubeCoordinate, kind: VisibleFace): boolean => {
  const { x, y, z } = cube;
  if (kind === "top") return !structure.has(x, y, z + 1);
  if (kind === "x-max") return !structure.has(x + 1, y, z);
  return !structure.has(x, y + 1, z);
};

const faceDepth = (cube: CubeCoordinate, kind: VisibleFace): number => {
  const x = cube.x + (kind === "x-max" ? 1 : 0.5);
  const y = cube.y + (kind === "y-max" ? 1 : 0.5);
  const z = cube.z + (kind === "top" ? 1 : 0.5);
  // Points displaced by +[1,1,1] project to the same screen location and are
  // nearer this camera. Paint smaller x+y+z first, then nearer faces last.
  return x + y + z;
};

/**
 * Render DAT-style isometric cube-counting line art.
 *
 * Only exposed camera-facing faces are emitted. Opaque faces are painted
 * far-to-near, so closer cubes hide rear geometry while the front vertical
 * corner and both side planes remain closed by their polygon strokes.
 */
export const renderVoxelStructure = (structure: VoxelStructure): string => {
  const attrs = {
    fill: "white",
    stroke: "black",
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  } as const;

  const visibleFaces = structure.coordinates().flatMap((cube) =>
    (["top", "x-max", "y-max"] as const)
      .filter((kind) => isExposed(structure, cube, kind))
      .map((kind) => ({ polygon: face(cube, kind), depth: faceDepth(cube, kind) })))
    .sort((a, b) => a.depth - b.depth);

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
    description: "Closed isometric stack of identical cubes",
    children: polygons,
  });
};
