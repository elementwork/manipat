import type { Vec2 } from "@manipat/core";
import type { LogicalPolyhedron } from "./types.js";

export const CUBE: LogicalPolyhedron = {
  id: "cube",
  vertices: [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ],
  faces: [
    { id: "bottom", vertexIds: [0, 3, 2, 1] },
    { id: "top", vertexIds: [4, 5, 6, 7] },
    { id: "front", vertexIds: [0, 1, 5, 4] },
    { id: "right", vertexIds: [1, 2, 6, 5] },
    { id: "back", vertexIds: [2, 3, 7, 6] },
    { id: "left", vertexIds: [3, 0, 4, 7] },
  ],
};

export const TRIANGULAR_PRISM: LogicalPolyhedron = {
  id: "triangular-prism",
  vertices: [
    [-1, -0.8, -1], [1, -0.8, -1], [0, 1, -1],
    [-1, -0.8, 1], [1, -0.8, 1], [0, 1, 1],
  ],
  faces: [
    { id: "triangle-a", vertexIds: [0, 2, 1] },
    { id: "triangle-b", vertexIds: [3, 4, 5] },
    { id: "rect-01", vertexIds: [0, 1, 4, 3] },
    { id: "rect-12", vertexIds: [1, 2, 5, 4] },
    { id: "rect-20", vertexIds: [2, 0, 3, 5] },
  ],
};

export const SQUARE_PYRAMID: LogicalPolyhedron = {
  id: "square-pyramid",
  vertices: [
    [-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0], [0, 0, 1.7],
  ],
  faces: [
    { id: "base", vertexIds: [0, 3, 2, 1] },
    { id: "side-front", vertexIds: [0, 1, 4] },
    { id: "side-right", vertexIds: [1, 2, 4] },
    { id: "side-back", vertexIds: [2, 3, 4] },
    { id: "side-left", vertexIds: [3, 0, 4] },
  ],
};

export interface TrapezoidalPrismParameters {
  readonly bottomWidth: number;
  readonly topWidth: number;
  readonly height: number;
  readonly depth: number;
}

export const createTrapezoidalPrism = ({
  bottomWidth,
  topWidth,
  height,
  depth,
}: TrapezoidalPrismParameters): LogicalPolyhedron => {
  if (bottomWidth <= topWidth || topWidth <= 0 || height <= 0 || depth <= 0) {
    throw new RangeError("Trapezoidal prism requires bottomWidth > topWidth and positive dimensions");
  }
  const bottom = bottomWidth / 2;
  const top = topWidth / 2;
  const halfHeight = height / 2;
  const halfDepth = depth / 2;
  return {
    id: "trapezoidal-prism",
    vertices: [
      [-bottom, -halfDepth, -halfHeight], [bottom, -halfDepth, -halfHeight],
      [top, -halfDepth, halfHeight], [-top, -halfDepth, halfHeight],
      [-bottom, halfDepth, -halfHeight], [bottom, halfDepth, -halfHeight],
      [top, halfDepth, halfHeight], [-top, halfDepth, halfHeight],
    ],
    faces: [
      { id: "end-front", vertexIds: [0, 3, 2, 1] },
      { id: "end-back", vertexIds: [4, 5, 6, 7] },
      { id: "side-bottom", vertexIds: [0, 1, 5, 4] },
      { id: "side-right", vertexIds: [1, 2, 6, 5] },
      { id: "side-top", vertexIds: [2, 3, 7, 6] },
      { id: "side-left", vertexIds: [3, 0, 4, 7] },
    ],
  };
};

export interface HousePrismParameters {
  readonly width: number;
  readonly depth: number;
  readonly wallHeight: number;
  readonly roofHeight: number;
}

export const createHousePrism = ({
  width,
  depth,
  wallHeight,
  roofHeight,
}: HousePrismParameters): LogicalPolyhedron => {
  if (width <= 0 || depth <= 0 || wallHeight <= 0 || roofHeight <= 0) {
    throw new RangeError("House prism requires positive dimensions");
  }
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const bottomZ = -wallHeight / 2;
  const wallTopZ = wallHeight / 2;
  const peakZ = wallTopZ + roofHeight;
  return {
    id: "house-prism",
    vertices: [
      [-halfWidth, -halfDepth, bottomZ], [halfWidth, -halfDepth, bottomZ],
      [halfWidth, -halfDepth, wallTopZ], [0, -halfDepth, peakZ], [-halfWidth, -halfDepth, wallTopZ],
      [-halfWidth, halfDepth, bottomZ], [halfWidth, halfDepth, bottomZ],
      [halfWidth, halfDepth, wallTopZ], [0, halfDepth, peakZ], [-halfWidth, halfDepth, wallTopZ],
    ],
    faces: [
      { id: "end-front", vertexIds: [0, 4, 3, 2, 1] },
      { id: "end-back", vertexIds: [5, 6, 7, 8, 9] },
      { id: "side-bottom", vertexIds: [0, 1, 6, 5] },
      { id: "side-right", vertexIds: [1, 2, 7, 6] },
      { id: "roof-right", vertexIds: [2, 3, 8, 7] },
      { id: "roof-left", vertexIds: [3, 4, 9, 8] },
      { id: "side-left", vertexIds: [4, 0, 5, 9] },
    ],
  };
};

export interface ProfilePrismParameters {
  /** ID must start with profile- so the generic net builder can recognize it. */
  readonly id: `profile-${string}`;
  /** Convex X/Z profile, starting with its lower horizontal edge. */
  readonly profile: readonly Vec2[];
  readonly depth: number;
}

/**
 * Create an arbitrary profile prism. This extends the form-development model
 * bank from 4/5-edge profiles to 6–8-edge profiles while preserving exact
 * net-to-solid dimensional truth.
 */
export const createProfilePrism = ({ id, profile, depth }: ProfilePrismParameters): LogicalPolyhedron => {
  if (profile.length < 3 || depth <= 0) throw new RangeError("Profile prism requires at least three profile vertices and positive depth");
  const halfDepth = depth / 2;
  const front = profile.map(([x, z]) => [x, -halfDepth, z] as const);
  const back = profile.map(([x, z]) => [x, halfDepth, z] as const);
  const count = profile.length;
  const sideFaces = profile.map((_, index) => {
    const next = (index + 1) % count;
    return {
      id: `side-${index}`,
      vertexIds: [index, next, next + count, index + count],
    };
  });
  return {
    id,
    vertices: [...front, ...back],
    faces: [
      { id: "end-front", vertexIds: Array.from({ length: count }, (_, index) => index) },
      { id: "end-back", vertexIds: Array.from({ length: count }, (_, index) => count + (count - 1 - index)) },
      ...sideFaces,
    ],
  };
};

export const TRAPEZOIDAL_PRISM = createTrapezoidalPrism({
  bottomWidth: 2.6,
  topWidth: 1.6,
  height: 2,
  depth: 2,
});

export const HOUSE_PRISM = createHousePrism({
  width: 2,
  depth: 2,
  wallHeight: 1.2,
  roofHeight: 1.05,
});

/** Static examples retained for previews and backwards-compatible consumers. */
export const POLYHEDRA = [
  TRIANGULAR_PRISM,
  SQUARE_PYRAMID,
  TRAPEZOIDAL_PRISM,
  HOUSE_PRISM,
] as const;
