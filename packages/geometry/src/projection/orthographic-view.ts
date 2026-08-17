import {
  EPS,
  add3,
  canonicalStringify,
  cross3,
  dot3,
  fingerprint64,
  scale3,
  subtract3,
  type JsonValue,
  type Segment2,
  type Vec2,
  type Vec3,
} from "@manipat/core";
import type { CanonicalMesh } from "../kernel/types.js";
import type { ProjectionFrame } from "./frames.js";
import { extractLogicalTopology } from "../topology/logical-edges.js";

export interface OrthographicView {
  readonly frame: ProjectionFrame;
  readonly visible: readonly Segment2[];
  readonly hidden: readonly Segment2[];
  readonly bounds: { readonly min: Vec2; readonly max: Vec2 };
  readonly fingerprint: string;
}

const pointAt = (a: Vec3, b: Vec3, t: number): Vec3 => add3(a, scale3(subtract3(b, a), t));
const projectPoint = (point: Vec3, frame: ProjectionFrame): Vec2 => [
  dot3(point, frame.imageRight),
  dot3(point, frame.imageUp),
];
const snap = (value: number): number => {
  const result = Number((Math.round(value / EPS.projection) * EPS.projection).toPrecision(15));
  return Object.is(result, -0) ? 0 : result;
};
const comparePoint = (a: Vec2, b: Vec2): number => a[0] - b[0] || a[1] - b[1];
const canonicalSegment = ({ a, b }: Segment2): Segment2 => {
  const first: Vec2 = [snap(a[0]), snap(a[1])];
  const second: Vec2 = [snap(b[0]), snap(b[1])];
  return comparePoint(first, second) <= 0 ? { a: first, b: second } : { a: second, b: first };
};
const segmentKey = (segment: Segment2): string =>
  `${segment.a[0]},${segment.a[1]}:${segment.b[0]},${segment.b[1]}`;

const meshVertex = (mesh: CanonicalMesh, index: number): Vec3 => {
  const offset = index * 3;
  return [mesh.positions[offset] ?? 0, mesh.positions[offset + 1] ?? 0, mesh.positions[offset + 2] ?? 0];
};

const rayTriangleDistance = (
  origin: Vec3,
  direction: Vec3,
  a: Vec3,
  b: Vec3,
  c: Vec3,
): number | null => {
  const edge1 = subtract3(b, a);
  const edge2 = subtract3(c, a);
  const p = cross3(direction, edge2);
  const determinant = dot3(edge1, p);
  if (Math.abs(determinant) <= EPS.coplanar) return null;
  const inverse = 1 / determinant;
  const tVector = subtract3(origin, a);
  const u = dot3(tVector, p) * inverse;
  if (u < -EPS.point || u > 1 + EPS.point) return null;
  const q = cross3(tVector, edge1);
  const v = dot3(direction, q) * inverse;
  if (v < -EPS.point || u + v > 1 + EPS.point) return null;
  const distance = dot3(edge2, q) * inverse;
  return distance >= 0 ? distance : null;
};

const isVisible = (
  mesh: CanonicalMesh,
  point: Vec3,
  viewDirection: Vec3,
  rayLength: number,
): boolean => {
  const origin = subtract3(point, scale3(viewDirection, rayLength));
  let closest = Number.POSITIVE_INFINITY;
  for (let triangle = 0; triangle < mesh.triangleCount; triangle += 1) {
    const offset = triangle * 3;
    const ai = mesh.indices[offset];
    const bi = mesh.indices[offset + 1];
    const ci = mesh.indices[offset + 2];
    if (ai === undefined || bi === undefined || ci === undefined) continue;
    const distance = rayTriangleDistance(
      origin,
      viewDirection,
      meshVertex(mesh, ai),
      meshVertex(mesh, bi),
      meshVertex(mesh, ci),
    );
    if (distance !== null && distance < closest) closest = distance;
  }
  return closest >= rayLength - EPS.length * 10;
};

const mergePair = (first: Segment2, second: Segment2): Segment2 | null => {
  const candidates: readonly [Vec2, Vec2, Vec2, Vec2][] = [
    [first.a, first.b, second.a, second.b],
    [first.a, first.b, second.b, second.a],
    [first.b, first.a, second.a, second.b],
    [first.b, first.a, second.b, second.a],
  ];
  for (const [shared, otherFirst, secondShared, otherSecond] of candidates) {
    if (comparePoint(shared, secondShared) !== 0) continue;
    const firstVector: Vec2 = [otherFirst[0] - shared[0], otherFirst[1] - shared[1]];
    const secondVector: Vec2 = [otherSecond[0] - shared[0], otherSecond[1] - shared[1]];
    if (Math.abs(firstVector[0] * secondVector[1] - firstVector[1] * secondVector[0]) <= EPS.collinear) {
      return canonicalSegment({ a: otherFirst, b: otherSecond });
    }
  }
  return null;
};

export const mergeCollinearSegments = (input: readonly Segment2[]): readonly Segment2[] => {
  const segments = [...new Map(input.map(canonicalSegment).map((segment) => [segmentKey(segment), segment])).values()];
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let first = 0; first < segments.length; first += 1) {
      for (let second = first + 1; second < segments.length; second += 1) {
        const combined = mergePair(segments[first]!, segments[second]!);
        if (combined !== null) {
          segments.splice(second, 1);
          segments.splice(first, 1, combined);
          merged = true;
          break outer;
        }
      }
    }
  }
  return segments.sort((a, b) => segmentKey(a).localeCompare(segmentKey(b)));
};

export const canonicalizeOrthographicView = (
  frame: ProjectionFrame,
  visible: readonly Segment2[],
  hidden: readonly Segment2[],
): OrthographicView => {
  const mergedVisible = mergeCollinearSegments(visible);
  const visibleKeys = new Set(mergedVisible.map(segmentKey));
  const mergedHidden = mergeCollinearSegments(hidden).filter(
    (segment) => !visibleKeys.has(segmentKey(segment)),
  );
  const all = [...mergedVisible, ...mergedHidden];
  const points = all.flatMap(({ a, b }) => [a, b]);
  const bounds = points.length === 0
    ? { min: [0, 0] as Vec2, max: [0, 0] as Vec2 }
    : {
      min: [Math.min(...points.map(([x]) => x)), Math.min(...points.map(([, y]) => y))] as Vec2,
      max: [Math.max(...points.map(([x]) => x)), Math.max(...points.map(([, y]) => y))] as Vec2,
    };
  const fingerprint = fingerprint64(canonicalStringify({
    hidden: mergedHidden,
    visible: mergedVisible,
  } as unknown as JsonValue));
  return { frame, visible: mergedVisible, hidden: mergedHidden, bounds, fingerprint };
};

export const createOrthographicView = (
  mesh: CanonicalMesh,
  frame: ProjectionFrame,
): OrthographicView => {
  const topology = extractLogicalTopology(mesh);
  const dimensions = mesh.bounds.max.map((maximum, index) => maximum - (mesh.bounds.min[index] ?? 0));
  const rayLength = Math.hypot(...dimensions) * 3 + 1;
  const visible: Segment2[] = [];
  const hidden: Segment2[] = [];
  const subdivisions = 4;
  for (const edge of topology.edges) {
    for (let part = 0; part < subdivisions; part += 1) {
      const start = pointAt(edge.vertices.a, edge.vertices.b, part / subdivisions);
      const end = pointAt(edge.vertices.a, edge.vertices.b, (part + 1) / subdivisions);
      const projected = canonicalSegment({ a: projectPoint(start, frame), b: projectPoint(end, frame) });
      if (Math.hypot(projected.b[0] - projected.a[0], projected.b[1] - projected.a[1]) <= EPS.projection) continue;
      // Sample multiple points: endpoints + interior samples
      // An edge is visible if ANY sample point is visible (handles curved surfaces)
      const sampleTs = [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9];
      const edgeVisible = sampleTs.some((t) => isVisible(mesh, pointAt(start, end, t), frame.viewDirection, rayLength));
      (edgeVisible ? visible : hidden).push(projected);
    }
  }
  return canonicalizeOrthographicView(frame, visible, hidden);
};
