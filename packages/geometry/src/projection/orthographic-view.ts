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
import {
  extractLogicalTopology,
  type LogicalEdge,
  type LogicalFace,
} from "../topology/logical-edges.js";

export interface OrthographicView {
  readonly frame: ProjectionFrame;
  readonly visible: readonly Segment2[];
  readonly hidden: readonly Segment2[];
  readonly bounds: { readonly min: Vec2; readonly max: Vec2 };
  readonly fingerprint: string;
}

export interface OrthographicViewOptions {
  /** Fragment count per logical edge. */
  readonly subdivisions?: number;
  /** Midpoint mode supports refined visible/hidden transition clipping. */
  readonly visibilityRule?: "any-sample" | "midpoint";
  /**
   * Suppress shallow mesh/facet creases below this angle unless the edge is a
   * true view silhouette. Midpoint line-art defaults to 32° to suppress
   * polygonized cylinders while preserving normal DAT chamfers and corners.
   */
  readonly displayCreaseAngleDegrees?: number;
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

interface TriangleGrid {
  readonly triangles: readonly PreparedTriangle[];
  readonly cells: readonly (readonly number[])[];
  readonly columns: number;
  readonly rows: number;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
}

const pointAt = (a: Vec3, b: Vec3, t: number): Vec3 =>
  add3(a, scale3(subtract3(b, a), t));

const projectPoint = (point: Vec3, frame: ProjectionFrame): Vec2 => [
  dot3(point, frame.imageRight),
  dot3(point, frame.imageUp),
];

const snap = (value: number): number => {
  const result = Number((Math.round(value / EPS.projection) * EPS.projection).toPrecision(15));
  return Object.is(result, -0) ? 0 : result;
};

const comparePoint = (a: Vec2, b: Vec2): number => a[0] - b[0] || a[1] - b[1];
const pointKey = ([x, y]: Vec2): string => `${x},${y}`;

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

const gridCoordinate = (
  value: number,
  minimum: number,
  cellSize: number,
  count: number,
): number => Math.max(0, Math.min(count - 1, Math.floor((value - minimum) / cellSize)));

const prepareTriangleGrid = (
  mesh: CanonicalMesh,
  frame: ProjectionFrame,
): TriangleGrid => {
  const triangles = prepareTriangles(mesh, frame);
  if (triangles.length === 0) {
    return {
      triangles,
      cells: [[]],
      columns: 1,
      rows: 1,
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      cellWidth: 1,
      cellHeight: 1,
    };
  }

  const minX = Math.min(...triangles.map(({ minX: value }) => value));
  const minY = Math.min(...triangles.map(({ minY: value }) => value));
  const maxX = Math.max(...triangles.map(({ maxX: value }) => value));
  const maxY = Math.max(...triangles.map(({ maxY: value }) => value));
  const gridSize = Math.max(4, Math.min(32, Math.ceil(Math.sqrt(triangles.length / 2))));
  const columns = gridSize;
  const rows = gridSize;
  const cellWidth = Math.max(EPS.projection, (maxX - minX) / columns);
  const cellHeight = Math.max(EPS.projection, (maxY - minY) / rows);
  const cells: number[][] = Array.from({ length: columns * rows }, () => []);

  triangles.forEach((triangle, triangleIndex) => {
    const firstColumn = gridCoordinate(triangle.minX, minX, cellWidth, columns);
    const lastColumn = gridCoordinate(triangle.maxX, minX, cellWidth, columns);
    const firstRow = gridCoordinate(triangle.minY, minY, cellHeight, rows);
    const lastRow = gridCoordinate(triangle.maxY, minY, cellHeight, rows);
    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        cells[row * columns + column]?.push(triangleIndex);
      }
    }
  });

  return {
    triangles,
    cells,
    columns,
    rows,
    minX,
    minY,
    maxX,
    maxY,
    cellWidth,
    cellHeight,
  };
};

const candidateTriangleIndices = (
  grid: TriangleGrid,
  projected: Vec2,
): readonly number[] => {
  if (grid.triangles.length === 0
    || projected[0] < grid.minX || projected[0] > grid.maxX
    || projected[1] < grid.minY || projected[1] > grid.maxY) return [];
  const column = gridCoordinate(projected[0], grid.minX, grid.cellWidth, grid.columns);
  const row = gridCoordinate(projected[1], grid.minY, grid.cellHeight, grid.rows);
  return grid.cells[row * grid.columns + column] ?? [];
};

const isVisible = (
  grid: TriangleGrid,
  point: Vec3,
  frame: ProjectionFrame,
  rayLength: number,
): boolean => {
  const origin = subtract3(point, scale3(frame.viewDirection, rayLength));
  const projected = projectPoint(point, frame);
  const occlusionThreshold = rayLength - EPS.length * 10;
  for (const triangleIndex of candidateTriangleIndices(grid, projected)) {
    const triangle = grid.triangles[triangleIndex];
    if (triangle === undefined) continue;
    if (projected[0] < triangle.minX || projected[0] > triangle.maxX
      || projected[1] < triangle.minY || projected[1] > triangle.maxY) continue;
    const distance = rayTriangleDistance(
      origin,
      frame.viewDirection,
      triangle.a,
      triangle.b,
      triangle.c,
    );
    if (distance !== null && distance < occlusionThreshold) return false;
  }
  return true;
};

const areCollinear = (first: Segment2, second: Segment2): boolean => {
  const firstVector: Vec2 = [first.b[0] - first.a[0], first.b[1] - first.a[1]];
  const secondVector: Vec2 = [second.b[0] - second.a[0], second.b[1] - second.a[1]];
  return Math.abs(firstVector[0] * secondVector[1] - firstVector[1] * secondVector[0]) <= EPS.collinear;
};

export const mergeCollinearSegments = (input: readonly Segment2[]): readonly Segment2[] => {
  const segments = [...new Map(input.map(canonicalSegment).map((segment) => [segmentKey(segment), segment])).values()];
  if (segments.length <= 1) return segments;

  const incident = new Map<string, number[]>();
  segments.forEach((segment, index) => {
    for (const point of [segment.a, segment.b]) {
      const key = pointKey(point);
      const indices = incident.get(key) ?? [];
      indices.push(index);
      incident.set(key, indices);
    }
  });

  const visited = new Set<number>();
  const merged: Segment2[] = [];
  for (let start = 0; start < segments.length; start += 1) {
    if (visited.has(start)) continue;
    const seed = segments[start];
    if (seed === undefined) continue;
    const queue = [start];
    const component: number[] = [];
    visited.add(start);

    while (queue.length > 0) {
      const currentIndex = queue.pop();
      if (currentIndex === undefined) continue;
      const current = segments[currentIndex];
      if (current === undefined) continue;
      component.push(currentIndex);
      for (const endpoint of [current.a, current.b]) {
        for (const neighborIndex of incident.get(pointKey(endpoint)) ?? []) {
          if (visited.has(neighborIndex)) continue;
          const neighbor = segments[neighborIndex];
          if (neighbor === undefined || !areCollinear(current, neighbor)) continue;
          visited.add(neighborIndex);
          queue.push(neighborIndex);
        }
      }
    }

    if (component.length === 1) {
      merged.push(seed);
      continue;
    }

    const dx = seed.b[0] - seed.a[0];
    const dy = seed.b[1] - seed.a[1];
    const squaredLength = dx * dx + dy * dy;
    if (squaredLength <= EPS.projection * EPS.projection) {
      merged.push(seed);
      continue;
    }

    let minimumPoint = seed.a;
    let maximumPoint = seed.b;
    let minimumProjection = seed.a[0] * dx + seed.a[1] * dy;
    let maximumProjection = seed.b[0] * dx + seed.b[1] * dy;
    for (const index of component) {
      const segment = segments[index];
      if (segment === undefined) continue;
      for (const point of [segment.a, segment.b]) {
        const projection = point[0] * dx + point[1] * dy;
        if (projection < minimumProjection) {
          minimumProjection = projection;
          minimumPoint = point;
        }
        if (projection > maximumProjection) {
          maximumProjection = projection;
          maximumPoint = point;
        }
      }
    }
    merged.push(canonicalSegment({ a: minimumPoint, b: maximumPoint }));
  }

  return [...new Map(merged.map((segment) => [segmentKey(segment), segment])).values()]
    .sort((a, b) => segmentKey(a).localeCompare(segmentKey(b)));
};

const pointOnSegment2 = (point: Vec2, segment: Segment2): boolean => {
  const dx = segment.b[0] - segment.a[0];
  const dy = segment.b[1] - segment.a[1];
  const cross = (point[0] - segment.a[0]) * dy - (point[1] - segment.a[1]) * dx;
  const tolerance = EPS.projection * Math.max(4, Math.hypot(dx, dy));
  if (Math.abs(cross) > tolerance) return false;
  const dot = (point[0] - segment.a[0]) * dx + (point[1] - segment.a[1]) * dy;
  return dot >= -tolerance && dot <= dx * dx + dy * dy + tolerance;
};

const coveredByVisible = (hidden: Segment2, visible: readonly Segment2[]): boolean =>
  visible.some((candidate) => pointOnSegment2(hidden.a, candidate) && pointOnSegment2(hidden.b, candidate));

export const canonicalizeOrthographicView = (
  frame: ProjectionFrame,
  visible: readonly Segment2[],
  hidden: readonly Segment2[],
): OrthographicView => {
  const mergedVisible = mergeCollinearSegments(visible);
  const mergedHidden = mergeCollinearSegments(hidden).filter(
    (segment) => !coveredByVisible(segment, mergedVisible),
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

const clampUnit = (value: number): number => Math.max(-1, Math.min(1, value));

const isViewSilhouette = (
  edge: LogicalEdge,
  facesById: ReadonlyMap<string, LogicalFace>,
  frame: ProjectionFrame,
): boolean => {
  if (edge.adjacentFaceIds.length !== 2) return false;
  const first = facesById.get(edge.adjacentFaceIds[0] ?? "");
  const second = facesById.get(edge.adjacentFaceIds[1] ?? "");
  if (first === undefined || second === undefined) return false;
  const firstFacing = dot3(first.normal, frame.viewDirection);
  const secondFacing = dot3(second.normal, frame.viewDirection);
  return (firstFacing <= EPS.coplanar && secondFacing >= -EPS.coplanar)
    || (secondFacing <= EPS.coplanar && firstFacing >= -EPS.coplanar);
};

const shouldDisplayEdge = (
  edge: LogicalEdge,
  facesById: ReadonlyMap<string, LogicalFace>,
  frame: ProjectionFrame,
  minimumCreaseAngleDegrees: number,
): boolean => {
  if (edge.adjacentFaceIds.length !== 2) return true;
  const first = facesById.get(edge.adjacentFaceIds[0] ?? "");
  const second = facesById.get(edge.adjacentFaceIds[1] ?? "");
  if (first === undefined || second === undefined) return true;
  if (isViewSilhouette(edge, facesById, frame)) return true;
  const cosine = clampUnit(dot3(first.normal, second.normal));
  const angle = Math.acos(cosine) * 180 / Math.PI;
  return angle + 1e-8 >= minimumCreaseAngleDegrees;
};

const refineTransition = (
  edge: LogicalEdge,
  grid: TriangleGrid,
  frame: ProjectionFrame,
  rayLength: number,
  leftT: number,
  rightT: number,
  leftState: boolean,
): number => {
  let low = leftT;
  let high = rightT;
  for (let iteration = 0; iteration < 10; iteration += 1) {
    const middle = (low + high) / 2;
    const state = isVisible(grid, pointAt(edge.vertices.a, edge.vertices.b, middle), frame, rayLength);
    if (state === leftState) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
};

const pushProjectedRun = (
  target: Segment2[],
  edge: LogicalEdge,
  frame: ProjectionFrame,
  startT: number,
  endT: number,
): void => {
  const projected = canonicalSegment({
    a: projectPoint(pointAt(edge.vertices.a, edge.vertices.b, startT), frame),
    b: projectPoint(pointAt(edge.vertices.a, edge.vertices.b, endT), frame),
  });
  if (Math.hypot(projected.b[0] - projected.a[0], projected.b[1] - projected.a[1]) > EPS.projection) {
    target.push(projected);
  }
};

export const createOrthographicView = (
  mesh: CanonicalMesh,
  frame: ProjectionFrame,
  options: OrthographicViewOptions = {},
): OrthographicView => {
  const topology = extractLogicalTopology(mesh);
  const facesById = new Map(topology.faces.map((face) => [face.id, face] as const));
  const dimensions = mesh.bounds.max.map((maximum, index) => maximum - (mesh.bounds.min[index] ?? 0));
  const rayLength = Math.hypot(...dimensions) * 3 + 1;
  const triangleGrid = prepareTriangleGrid(mesh, frame);
  const visible: Segment2[] = [];
  const hidden: Segment2[] = [];
  const subdivisions = Math.max(1, Math.floor(options.subdivisions ?? 4));
  const visibilityRule = options.visibilityRule ?? "any-sample";
  const minimumCreaseAngleDegrees = options.displayCreaseAngleDegrees
    ?? (visibilityRule === "midpoint" ? 32 : 20);

  for (const edge of topology.edges) {
    if (!shouldDisplayEdge(edge, facesById, frame, minimumCreaseAngleDegrees)) continue;

    const states = Array.from({ length: subdivisions }, (_, part) => {
      const startT = part / subdivisions;
      const endT = (part + 1) / subdivisions;
      if (visibilityRule === "midpoint") {
        return isVisible(
          triangleGrid,
          pointAt(edge.vertices.a, edge.vertices.b, (startT + endT) / 2),
          frame,
          rayLength,
        );
      }
      const start = pointAt(edge.vertices.a, edge.vertices.b, startT);
      const end = pointAt(edge.vertices.a, edge.vertices.b, endT);
      return [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9].some((t) =>
        isVisible(triangleGrid, pointAt(start, end, t), frame, rayLength));
    });

    const boundaries = Array.from({ length: subdivisions + 1 }, (_, index) => index / subdivisions);
    if (visibilityRule === "midpoint") {
      for (let boundary = 1; boundary < subdivisions; boundary += 1) {
        const leftState = states[boundary - 1];
        const rightState = states[boundary];
        if (leftState === undefined || rightState === undefined || leftState === rightState) continue;
        const leftMidpoint = (boundary - 0.5) / subdivisions;
        const rightMidpoint = (boundary + 0.5) / subdivisions;
        boundaries[boundary] = refineTransition(
          edge,
          triangleGrid,
          frame,
          rayLength,
          leftMidpoint,
          rightMidpoint,
          leftState,
        );
      }
    }

    let runStart = 0;
    while (runStart < subdivisions) {
      const state = states[runStart] ?? false;
      let runEnd = runStart + 1;
      while (runEnd < subdivisions && states[runEnd] === state) runEnd += 1;
      pushProjectedRun(
        state ? visible : hidden,
        edge,
        frame,
        boundaries[runStart] ?? runStart / subdivisions,
        boundaries[runEnd] ?? runEnd / subdivisions,
      );
      runStart = runEnd;
    }
  }

  return canonicalizeOrthographicView(frame, visible, hidden);
};
