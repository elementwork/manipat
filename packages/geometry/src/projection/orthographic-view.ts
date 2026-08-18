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

export interface OrthographicViewOptions {
  /** Fragment count per logical edge. Default 4 preserves existing TFE output. */
  readonly subdivisions?: number;
  /** Midpoint mode clips partial occlusion more conservatively for pictorial line art. */
  readonly visibilityRule?: "any-sample" | "midpoint";
}

interface PreparedTriangle {
  readonly a: Vec3;
  readonly b: Vec3;
  readonly c: Vec3;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
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

const prepareTriangles = (
  mesh: CanonicalMesh,
  frame: ProjectionFrame,
): readonly PreparedTriangle[] => {
  const triangles: PreparedTriangle[] = [];
  for (let triangle = 0; triangle < mesh.triangleCount; triangle += 1) {
    const offset = triangle * 3;
    const ai = mesh.indices[offset];
    const bi = mesh.indices[offset + 1];
    const ci = mesh.indices[offset + 2];
    if (ai === undefined || bi === undefined || ci === undefined) continue;
    const a = meshVertex(mesh, ai);
    const b = meshVertex(mesh, bi);
    const c = meshVertex(mesh, ci);
    const pa = projectPoint(a, frame);
    const pb = projectPoint(b, frame);
    const pc = projectPoint(c, frame);
    triangles.push({
      a,
      b,
      c,
      minX: Math.min(pa[0], pb[0], pc[0]) - EPS.projection,
      maxX: Math.max(pa[0], pb[0], pc[0]) + EPS.projection,
      minY: Math.min(pa[1], pb[1], pc[1]) - EPS.projection,
      maxY: Math.max(pa[1], pb[1], pc[1]) + EPS.projection,
    });
  }
  return triangles;
};

const isVisible = (
  triangles: readonly PreparedTriangle[],
  point: Vec3,
  frame: ProjectionFrame,
  rayLength: number,
): boolean => {
  const origin = subtract3(point, scale3(frame.viewDirection, rayLength));
  const projected = projectPoint(point, frame);
  let closest = Number.POSITIVE_INFINITY;
  for (const triangle of triangles) {
    // Orthographic rays retain their projected image coordinate. A triangle
    // whose projected bounds do not contain that coordinate cannot intersect
    // the ray, so skip the expensive exact ray/triangle test.
    if (projected[0] < triangle.minX || projected[0] > triangle.maxX
      || projected[1] < triangle.minY || projected[1] > triangle.maxY) continue;
    const distance = rayTriangleDistance(
      origin,
      frame.viewDirection,
      triangle.a,
      triangle.b,
      triangle.c,
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
  options: OrthographicViewOptions = {},
): OrthographicView => {
  const topology = extractLogicalTopology(mesh);
  const dimensions = mesh.bounds.max.map((maximum, index) => maximum - (mesh.bounds.min[index] ?? 0));
  const rayLength = Math.hypot(...dimensions) * 3 + 1;
  const triangles = prepareTriangles(mesh, frame);
  const visible: Segment2[] = [];
  const hidden: Segment2[] = [];
  const subdivisions = options.subdivisions ?? 4;
  const visibilityRule = options.visibilityRule ?? "any-sample";

  for (const edge of topology.edges) {
    for (let part = 0; part < subdivisions; part += 1) {
      const startT = part / subdivisions;
      const endT = (part + 1) / subdivisions;
      const start = pointAt(edge.vertices.a, edge.vertices.b, startT);
      const end = pointAt(edge.vertices.a, edge.vertices.b, endT);
      const projected = canonicalSegment({ a: projectPoint(start, frame), b: projectPoint(end, frame) });
      if (Math.hypot(projected.b[0] - projected.a[0], projected.b[1] - projected.a[1]) <= EPS.projection) continue;

      const edgeVisible = visibilityRule === "midpoint"
        ? isVisible(triangles, pointAt(edge.vertices.a, edge.vertices.b, (startT + endT) / 2), frame, rayLength)
        : [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9].some((t) =>
          isVisible(triangles, pointAt(start, end, t), frame, rayLength));
      (edgeVisible ? visible : hidden).push(projected);
    }
  }
  return canonicalizeOrthographicView(frame, visible, hidden);
};