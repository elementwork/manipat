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

/** A prism with a trapezoidal end profile: six faces with unequal slanted sides. */
export const TRAPEZOIDAL_PRISM: LogicalPolyhedron = {
  id: "trapezoidal-prism",
  vertices: [
    [-1.3, -1, -1], [1.3, -1, -1], [0.8, -1, 1], [-0.8, -1, 1],
    [-1.3, 1, -1], [1.3, 1, -1], [0.8, 1, 1], [-0.8, 1, 1],
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

/**
 * Seven-face "house" prism. The pentagonal end profile gives the folded choices
 * multiple sloped faces and roof angles, much closer to the irregular geometry
 * used by the golden form-development examples.
 */
export const HOUSE_PRISM: LogicalPolyhedron = {
  id: "house-prism",
  vertices: [
    [-1, -1, -1], [1, -1, -1], [1, -1, 0.2], [0, -1, 1.25], [-1, -1, 0.2],
    [-1, 1, -1], [1, 1, -1], [1, 1, 0.2], [0, 1, 1.25], [-1, 1, 0.2],
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

export const POLYHEDRA = [
  TRIANGULAR_PRISM,
  SQUARE_PYRAMID,
  TRAPEZOIDAL_PRISM,
  HOUSE_PRISM,
] as const;
