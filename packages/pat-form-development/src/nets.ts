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

const distance2 = (a: Vec2, b: Vec2): number => Math.hypot(b[0] - a[0], b[1] - a[1]);

interface PrismNetDefinition {
  readonly profileVertexIds: readonly number[];
  readonly backProfileVertexIds: readonly number[];
  readonly sideFaceIds: readonly string[];
  readonly frontFaceId: string;
  readonly backFaceId: string;
}

export type NetLayoutStyle = "legacy" | "strip-split-a" | "strip-split-b" | "fan-hub";

export interface NetWithStyle {
  readonly net: PolyhedronNet;
  readonly style: NetLayoutStyle;
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

const profile2d = (vertices: readonly Vec3[]): readonly Vec2[] => {
  const first = vertices[0];
  if (first === undefined) return [];
  return vertices.map(([x, , z]): Vec2 => [x - first[0], -(z - first[2])]);
};

const polygonCenter = (polygon: readonly Vec2[]): Vec2 => [
  polygon.reduce((sum, [x]) => sum + x, 0) / polygon.length,
  polygon.reduce((sum, [, y]) => sum + y, 0) / polygon.length,
];

const signedArea = (polygon: readonly Vec2[]): number => polygon.reduce((sum, [x1, y1], index) => {
  const [x2, y2] = polygon[(index + 1) % polygon.length] ?? [x1, y1];
  return sum + x1 * y2 - x2 * y1;
}, 0) / 2;

const reflectAcrossLine = (point: Vec2, a: Vec2, b: Vec2): Vec2 => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const denominator = dx * dx + dy * dy;
  if (denominator <= 1e-12) return point;
  const t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / denominator;
  const projection: Vec2 = [a[0] + t * dx, a[1] + t * dy];
  return [2 * projection[0] - point[0], 2 * projection[1] - point[1]];
};

const placeProfileOnHorizontalEdge = (
  profile: readonly Vec2[],
  edgeIndex: number,
  targetA: Vec2,
  targetB: Vec2,
  desiredSide: "above" | "below",
): readonly Vec2[] => {
  const sourceA = profile[edgeIndex];
  const sourceB = profile[(edgeIndex + 1) % profile.length];
  if (sourceA === undefined || sourceB === undefined) return profile;
  const sourceDx = sourceB[0] - sourceA[0];
  const sourceDy = sourceB[1] - sourceA[1];
  const targetDx = targetB[0] - targetA[0];
  const targetDy = targetB[1] - targetA[1];
  const sourceLength = Math.max(1e-12, Math.hypot(sourceDx, sourceDy));
  const targetLength = Math.hypot(targetDx, targetDy);
  const cosine = (sourceDx * targetDx + sourceDy * targetDy) / (sourceLength * Math.max(1e-12, targetLength));
  const sine = (sourceDx * targetDy - sourceDy * targetDx) / (sourceLength * Math.max(1e-12, targetLength));
  const scale = targetLength / sourceLength;
  let transformed = profile.map(([x, y]): Vec2 => {
    const rx = x - sourceA[0];
    const ry = y - sourceA[1];
    return [
      targetA[0] + (rx * cosine - ry * sine) * scale,
      targetA[1] + (rx * sine + ry * cosine) * scale,
    ];
  });
  const center = polygonCenter(transformed);
  const shouldReflect = desiredSide === "above"
    ? center[1] < targetA[1]
    : center[1] > targetA[1];
  if (shouldReflect) transformed = transformed.map(([x, y]): Vec2 => [x, 2 * targetA[1] - y]);
  return transformed;
};

const prismGeometry = (
  polyhedron: LogicalPolyhedron,
  definition: PrismNetDefinition,
): {
  readonly profile: readonly Vec2[];
  readonly depth: number;
  readonly edgeLengths: readonly number[];
} => {
  const front = definition.profileVertexIds.map((id) => polyhedron.vertices[id]);
  const back = definition.backProfileVertexIds.map((id) => polyhedron.vertices[id]);
  if (front.some((vertex) => vertex === undefined) || back.some((vertex) => vertex === undefined)) {
    throw new TypeError(`Polyhedron ${polyhedron.id} has incomplete prism profile vertices`);
  }
  const typedFront = front as readonly Vec3[];
  const typedBack = back as readonly Vec3[];
  return {
    profile: profile2d(typedFront),
    depth: distance3(typedFront[0]!, typedBack[0]!),
    edgeLengths: typedFront.map((vertex, index) =>
      distance3(vertex, typedFront[(index + 1) % typedFront.length]!)),
  };
};

const buildStripPrismNet = (
  polyhedron: LogicalPolyhedron,
  definition: PrismNetDefinition,
  frontIndex: number,
  backIndex: number,
): PolyhedronNet => {
  const { profile, depth, edgeLengths } = prismGeometry(polyhedron, definition);
  const cursors: number[] = [];
  let cursor = 0;
  const sideFaces: NetFace[] = definition.sideFaceIds.map((faceId, index) => {
    cursors.push(cursor);
    const width = edgeLengths[index] ?? 0;
    const polygon: readonly Vec2[] = [
      [cursor, 0], [cursor + width, 0], [cursor + width, depth], [cursor, depth],
    ];
    cursor += width;
    return { faceId, polygon };
  });

  const safeFront = ((frontIndex % sideFaces.length) + sideFaces.length) % sideFaces.length;
  const safeBack = ((backIndex % sideFaces.length) + sideFaces.length) % sideFaces.length;
  const frontX = cursors[safeFront] ?? 0;
  const backX = cursors[safeBack] ?? 0;
  const frontWidth = edgeLengths[safeFront] ?? 0;
  const backWidth = edgeLengths[safeBack] ?? 0;
  const frontPolygon = placeProfileOnHorizontalEdge(
    profile,
    safeFront,
    [frontX, 0],
    [frontX + frontWidth, 0],
    "below",
  );
  const backPolygon = placeProfileOnHorizontalEdge(
    profile,
    safeBack,
    [backX, depth],
    [backX + backWidth, depth],
    "above",
  );

  const connections: NetConnection[] = [];
  for (let index = 0; index < definition.sideFaceIds.length - 1; index += 1) {
    connections.push({
      faceA: definition.sideFaceIds[index]!,
      faceB: definition.sideFaceIds[index + 1]!,
    });
  }
  connections.push(
    { faceA: definition.sideFaceIds[safeFront]!, faceB: definition.frontFaceId },
    { faceA: definition.sideFaceIds[safeBack]!, faceB: definition.backFaceId },
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

const buildFanPrismNet = (
  polyhedron: LogicalPolyhedron,
  definition: PrismNetDefinition,
  backIndex: number,
): PolyhedronNet => {
  const { profile, depth, edgeLengths } = prismGeometry(polyhedron, definition);
  const area = signedArea(profile);
  const sideFaces: NetFace[] = definition.sideFaceIds.map((faceId, index) => {
    const a = profile[index]!;
    const b = profile[(index + 1) % profile.length]!;
    const edgeLength = Math.max(1e-12, edgeLengths[index] ?? distance2(a, b));
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const outward: Vec2 = area >= 0
      ? [dy / edgeLength, -dx / edgeLength]
      : [-dy / edgeLength, dx / edgeLength];
    const offset: Vec2 = [outward[0] * depth, outward[1] * depth];
    return {
      faceId,
      polygon: [
        a,
        b,
        [b[0] + offset[0], b[1] + offset[1]],
        [a[0] + offset[0], a[1] + offset[1]],
      ],
    };
  });

  const safeBack = ((backIndex % sideFaces.length) + sideFaces.length) % sideFaces.length;
  const sourceA = profile[safeBack]!;
  const sourceB = profile[(safeBack + 1) % profile.length]!;
  const edgeLength = Math.max(1e-12, edgeLengths[safeBack] ?? distance2(sourceA, sourceB));
  const dx = sourceB[0] - sourceA[0];
  const dy = sourceB[1] - sourceA[1];
  const outward: Vec2 = area >= 0
    ? [dy / edgeLength, -dx / edgeLength]
    : [-dy / edgeLength, dx / edgeLength];
  const offset: Vec2 = [outward[0] * depth, outward[1] * depth];
  const outerA: Vec2 = [sourceA[0] + offset[0], sourceA[1] + offset[1]];
  const outerB: Vec2 = [sourceB[0] + offset[0], sourceB[1] + offset[1]];
  const backPolygon = profile.map(([x, y]): Vec2 =>
    reflectAcrossLine([x + offset[0], y + offset[1]], outerA, outerB));

  return {
    polyhedronId: polyhedron.id,
    faces: [
      { faceId: definition.frontFaceId, polygon: profile },
      ...sideFaces,
      { faceId: definition.backFaceId, polygon: backPolygon },
    ],
    connections: [
      ...definition.sideFaceIds.map((faceId): NetConnection => ({
        faceA: definition.frontFaceId,
        faceB: faceId,
      })),
      { faceA: definition.sideFaceIds[safeBack]!, faceB: definition.backFaceId },
    ],
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
  const firstCenter: Vec2 = polygonCenter(first.polygon);
  const secondCenter: Vec2 = polygonCenter(second.polygon);
  return pointInside(firstCenter, second.polygon) || pointInside(secondCenter, first.polygon);
};

const netHasOverlap = (net: PolyhedronNet): boolean => {
  for (let first = 0; first < net.faces.length; first += 1) {
    for (let second = first + 1; second < net.faces.length; second += 1) {
      if (polygonsOverlap(net.faces[first]!, net.faces[second]!)) return true;
    }
  }
  return false;
};

const attachmentOrder = (preferred: number, count: number): readonly number[] =>
  Array.from({ length: count }, (_, index) => index).sort((a, b) => {
    const normalizedPreferred = ((preferred % count) + count) % count;
    const distanceA = Math.min(
      (a - normalizedPreferred + count) % count,
      (normalizedPreferred - a + count) % count,
    );
    const distanceB = Math.min(
      (b - normalizedPreferred + count) % count,
      (normalizedPreferred - b + count) % count,
    );
    return distanceA - distanceB || a - b;
  });

/**
 * Search attachment edges deterministically instead of assuming one pair is
 * valid for every continuously generated profile. The first valid result stays
 * close to the preferred layout while guaranteeing non-overlapping net faces.
 */
const buildSafeStripPrismNet = (
  polyhedron: LogicalPolyhedron,
  definition: PrismNetDefinition,
  preferredFront: number,
  preferredBack: number,
): PolyhedronNet => {
  const count = definition.sideFaceIds.length;
  const fronts = attachmentOrder(preferredFront, count);
  const backs = attachmentOrder(preferredBack, count);
  for (const front of fronts) {
    for (const back of backs) {
      const net = buildStripPrismNet(polyhedron, definition, front, back);
      if (!netHasOverlap(net)) return net;
    }
  }
  throw new TypeError(`Could not construct a non-overlapping strip net for ${polyhedron.id}`);
};

export const createNetWithStyle = (
  polyhedron: LogicalPolyhedron,
  variant = 0,
): NetWithStyle => {
  const definition = prismDefinition(polyhedron);
  if (definition === undefined) {
    const legacy = LEGACY_NETS[polyhedron.id];
    if (legacy === undefined) throw new TypeError(`No net builder registered for ${polyhedron.id}`);
    return { net: legacy, style: "legacy" };
  }

  const count = definition.sideFaceIds.length;
  const normalizedVariant = ((variant % 3) + 3) % 3;
  if (normalizedVariant === 1) {
    const fan = buildFanPrismNet(polyhedron, definition, Math.floor(count / 2));
    if (!netHasOverlap(fan)) return { net: fan, style: "fan-hub" };
    return {
      net: buildSafeStripPrismNet(polyhedron, definition, 0, Math.max(1, Math.floor(count / 2))),
      style: "strip-split-a",
    };
  }
  if (normalizedVariant === 2) {
    return {
      net: buildSafeStripPrismNet(
        polyhedron,
        definition,
        Math.floor(count / 3),
        Math.floor(count * 2 / 3),
      ),
      style: "strip-split-b",
    };
  }
  return {
    net: buildSafeStripPrismNet(polyhedron, definition, 0, Math.max(1, Math.floor(count / 2))),
    style: "strip-split-a",
  };
};

export const createNet = (polyhedron: LogicalPolyhedron, variant = 0): PolyhedronNet =>
  createNetWithStyle(polyhedron, variant).net;

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
  if (netHasOverlap(net)) errors.push("Net faces overlap");
  return { valid: errors.length === 0, errors };
};
