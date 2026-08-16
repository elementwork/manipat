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

export const POLYHEDRA = [CUBE, TRIANGULAR_PRISM, SQUARE_PYRAMID] as const;
