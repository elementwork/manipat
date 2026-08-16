import type { Vec2 } from "@manipat/core";
import { areFacesAdjacent, buildFaceAdjacency } from "./adjacency.js";
import type {
  LogicalPolyhedron,
  NetFace,
  PolyhedronNet,
} from "./types.js";

const square = (x: number, y: number): readonly Vec2[] => [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];

const NETS: Readonly<Record<LogicalPolyhedron["id"], PolyhedronNet>> = {
  cube: {
    polyhedronId: "cube",
    faces: [
      { faceId: "front", polygon: square(1, 1) },
      { faceId: "left", polygon: square(0, 1) },
      { faceId: "right", polygon: square(2, 1) },
      { faceId: "top", polygon: square(1, 2) },
      { faceId: "bottom", polygon: square(1, 0) },
      { faceId: "back", polygon: square(1, 3) },
    ],
    connections: [
      { faceA: "front", faceB: "left" }, { faceA: "front", faceB: "right" },
      { faceA: "front", faceB: "top" }, { faceA: "front", faceB: "bottom" },
      { faceA: "top", faceB: "back" },
    ],
  },
  "triangular-prism": {
    polyhedronId: "triangular-prism",
    faces: [
      { faceId: "rect-01", polygon: square(0, 1) },
      { faceId: "rect-12", polygon: square(1, 1) },
      { faceId: "rect-20", polygon: square(2, 1) },
      { faceId: "triangle-a", polygon: [[1, 1], [2, 1], [1.5, 0.15]] },
      { faceId: "triangle-b", polygon: [[1, 2], [1.5, 2.85], [2, 2]] },
    ],
    connections: [
      { faceA: "rect-01", faceB: "rect-12" },
      { faceA: "rect-12", faceB: "rect-20" },
      { faceA: "rect-12", faceB: "triangle-a" },
      { faceA: "rect-12", faceB: "triangle-b" },
    ],
  },
  "square-pyramid": {
    polyhedronId: "square-pyramid",
    faces: [
      { faceId: "base", polygon: square(1, 1) },
      { faceId: "side-front", polygon: [[1, 1], [2, 1], [1.5, 0.1]] },
      { faceId: "side-right", polygon: [[2, 1], [2.9, 1.5], [2, 2]] },
      { faceId: "side-back", polygon: [[1, 2], [2, 2], [1.5, 2.9]] },
      { faceId: "side-left", polygon: [[1, 1], [1, 2], [0.1, 1.5]] },
    ],
    connections: [
      { faceA: "base", faceB: "side-front" }, { faceA: "base", faceB: "side-right" },
      { faceA: "base", faceB: "side-back" }, { faceA: "base", faceB: "side-left" },
    ],
  },
};

const cross = (a: Vec2, b: Vec2, c: Vec2): number =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

const properIntersection = (a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean =>
  cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;

const pointInside = (point: Vec2, polygon: readonly Vec2[]): boolean => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[index];
    const b = polygon[previous];
    if (a === undefined || b === undefined) continue;
    if ((a[1] > point[1]) !== (b[1] > point[1])
      && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
};

const polygonsOverlap = (first: NetFace, second: NetFace): boolean => {
  for (let i = 0; i < first.polygon.length; i += 1) {
    const a = first.polygon[i];
    const b = first.polygon[(i + 1) % first.polygon.length];
    if (a === undefined || b === undefined) continue;
    for (let j = 0; j < second.polygon.length; j += 1) {
      const c = second.polygon[j];
      const d = second.polygon[(j + 1) % second.polygon.length];
      if (c !== undefined && d !== undefined && properIntersection(a, b, c, d)) return true;
    }
  }
  const firstCenter: Vec2 = [
    first.polygon.reduce((sum, [x]) => sum + x, 0) / first.polygon.length,
    first.polygon.reduce((sum, [, y]) => sum + y, 0) / first.polygon.length,
  ];
  const secondCenter: Vec2 = [
    second.polygon.reduce((sum, [x]) => sum + x, 0) / second.polygon.length,
    second.polygon.reduce((sum, [, y]) => sum + y, 0) / second.polygon.length,
  ];
  return pointInside(firstCenter, second.polygon) || pointInside(secondCenter, first.polygon);
};

export const createNet = (polyhedron: LogicalPolyhedron): PolyhedronNet => NETS[polyhedron.id];

export interface NetVerification {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export const verifyNet = (
  polyhedron: LogicalPolyhedron,
  net: PolyhedronNet,
): NetVerification => {
  const errors: string[] = [];
  const adjacency = buildFaceAdjacency(polyhedron);
  const faceIds = new Set(polyhedron.faces.map(({ id }) => id));
  const netIds = new Set(net.faces.map(({ faceId }) => faceId));
  if (netIds.size !== faceIds.size || [...faceIds].some((id) => !netIds.has(id))) errors.push("Net does not contain every face exactly once");
  if (net.connections.length !== polyhedron.faces.length - 1) errors.push("Net connections do not form a spanning tree");
  if (net.connections.some(({ faceA, faceB }) => !areFacesAdjacent(adjacency, faceA, faceB))) errors.push("Net contains a non-adjacent face connection");
  const reached = new Set<string>([net.faces[0]?.faceId ?? ""]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const { faceA, faceB } of net.connections) {
      if (reached.has(faceA) && !reached.has(faceB)) { reached.add(faceB); changed = true; }
      if (reached.has(faceB) && !reached.has(faceA)) { reached.add(faceA); changed = true; }
    }
  }
  if (reached.size !== net.faces.length) errors.push("Net is disconnected");
  for (let first = 0; first < net.faces.length; first += 1) {
    for (let second = first + 1; second < net.faces.length; second += 1) {
      if (polygonsOverlap(net.faces[first]!, net.faces[second]!)) errors.push("Net faces overlap");
    }
  }
  return { valid: errors.length === 0, errors };
};
