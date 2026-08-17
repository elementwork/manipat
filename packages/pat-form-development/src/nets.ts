import type { Vec2, Vec3 } from "@manipat/core";
import { areFacesAdjacent, buildFaceAdjacency } from "./adjacency.js";
import type {
  LogicalPolyhedron,
  NetConnection,
  NetFace,
  PolyhedronNet,
} from "./types.js";

const square = (x: number, y: number): readonly Vec2[] => [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];

/** Legacy fixed nets retained for v1 question replay and previews. */
const LEGACY_NETS: Readonly<Partial<Record<LogicalPolyhedron["id"], PolyhedronNet>>> = {
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

const distance3 = (a: Vec3, b: Vec3): number => Math.hypot(
  b[0] - a[0],
  b[1] - a[1],
  b[2] - a[2],
);

interface PrismNetDefinition {
  readonly profileVertexIds: readonly number[];
  readonly backProfileVertexIds: readonly number[];
  readonly sideFaceIds: readonly string[];
  readonly frontFaceId: string;
  readonly backFaceId: string;
}

const prismDefinition = (polyhedron: LogicalPolyhedron): PrismNetDefinition | undefined => {
  switch (polyhedron.id) {
    case "trapezoidal-prism":
      return {
        profileVertexIds: [0, 1, 2, 3],
        backProfileVertexIds: [4, 5, 6, 7],
        sideFaceIds: ["side-bottom", "side-right", "side-top", "side-left"],
        frontFaceId: "end-front",
        backFaceId: "end-back",
      };
    case "house-prism":
      return {
        profileVertexIds: [0, 1, 2, 3, 4],
        backProfileVertexIds: [5, 6, 7, 8, 9],
        sideFaceIds: ["side-bottom", "side-right", "roof-right", "roof-left", "side-left"],
        frontFaceId: "end-front",
        backFaceId: "end-back",
      };
    default: {
      if (!polyhedron.id.startsWith("profile-") || polyhedron.vertices.length % 2 !== 0) return undefined;
      const count = polyhedron.vertices.length / 2;
      if (count < 3) return undefined;
      return {
        profileVertexIds: Array.from({ length: count }, (_, index) => index),
        backProfileVertexIds: Array.from({ length: count }, (_, index) => index + count),
        sideFaceIds: Array.from({ length: count }, (_, index) => `side-${index}`),
        frontFaceId: "end-front",
        backFaceId: "end-back",
      };
    }
  }
};

const buildPrismNet = (
  polyhedron: LogicalPolyhedron,
  definition: PrismNetDefinition,
): PolyhedronNet => {
  const profile = definition.profileVertexIds.map((id) => polyhedron.vertices[id]);
  const backProfile = definition.backProfileVertexIds.map((id) => polyhedron.vertices[id]);
  if (profile.some((vertex) => vertex === undefined) || backProfile.some((vertex) => vertex === undefined)) {
    throw new TypeError(`Polyhedron ${polyhedron.id} has incomplete prism profile vertices`);
  }
  const typedProfile = profile as readonly Vec3[];
  const typedBackProfile = backProfile as readonly Vec3[];
  const depth = distance3(typedProfile[0]!, typedBackProfile[0]!);
  const edgeLengths = typedProfile.map((vertex, index) =>
    distance3(vertex, typedProfile[(index + 1) % typedProfile.length]!));

  let cursor = 0;
  const sideFaces: NetFace[] = definition.sideFaceIds.map((faceId, index) => {
    const width = edgeLengths[index] ?? 0;
    const polygon: readonly Vec2[] = [
      [cursor, 0], [cursor + width, 0], [cursor + width, depth], [cursor, depth],
    ];
    cursor += width;
    return { faceId, polygon };
  });

  const first = typedProfile[0]!;
  const frontPolygon: readonly Vec2[] = typedProfile.map(([x, , z]): Vec2 => [
    x - first[0],
    -(z - first[2]),
  ]);
  const backPolygon: readonly Vec2[] = typedBackProfile.map(([x, , z]): Vec2 => [
    x - typedBackProfile[0]![0],
    depth + (z - typedBackProfile[0]![2]),
  ]);

  const connections: NetConnection[] = [];
  for (let index = 0; index < definition.sideFaceIds.length - 1; index += 1) {
    connections.push({
      faceA: definition.sideFaceIds[index]!,
      faceB: definition.sideFaceIds[index + 1]!,
    });
  }
  connections.push(
    { faceA: definition.sideFaceIds[0]!, faceB: definition.frontFaceId },
    { faceA: definition.sideFaceIds[0]!, faceB: definition.backFaceId },
  );

  return {
    polyhedronId: polyhedron.id,
    faces: [
      ...sideFaces,
      { faceId: definition.frontFaceId, polygon: frontPolygon },
      { faceId: definition.backFaceId, polygon: backPolygon },
    ],
    connections,
  };
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

export const createNet = (polyhedron: LogicalPolyhedron): PolyhedronNet => {
  const definition = prismDefinition(polyhedron);
  if (definition !== undefined) return buildPrismNet(polyhedron, definition);
  const legacy = LEGACY_NETS[polyhedron.id];
  if (legacy === undefined) throw new TypeError(`No net builder registered for ${polyhedron.id}`);
  return legacy;
};

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
