import {
  EPS,
  cross3,
  dot3,
  subtract3,
  type Segment3,
  type Vec3,
} from "@manipat/core";
import type { CanonicalMesh } from "../kernel/types.js";

export interface LogicalFace {
  readonly id: string;
  readonly triangleIds: readonly number[];
  readonly normal: Vec3;
  readonly sourceFeatureIds: readonly string[];
}

export interface LogicalEdge {
  readonly id: string;
  readonly vertices: Segment3;
  readonly adjacentFaceIds: readonly string[];
  readonly sourceFeatureIds: readonly string[];
  readonly kind: "boundary" | "crease" | "silhouette-candidate";
}

export interface LogicalTopology {
  readonly faces: readonly LogicalFace[];
  readonly edges: readonly LogicalEdge[];
  readonly triangleNormals: readonly Vec3[];
}

interface MeshEdgeUse {
  readonly triangleId: number;
  readonly a: number;
  readonly b: number;
}

const vertex = (mesh: CanonicalMesh, index: number): Vec3 => {
  const offset = index * 3;
  return [
    mesh.positions[offset] ?? 0,
    mesh.positions[offset + 1] ?? 0,
    mesh.positions[offset + 2] ?? 0,
  ];
};

const triangleVertices = (
  mesh: CanonicalMesh,
  triangleId: number,
): readonly [number, number, number] => {
  const offset = triangleId * 3;
  const a = mesh.indices[offset];
  const b = mesh.indices[offset + 1];
  const c = mesh.indices[offset + 2];
  if (a === undefined || b === undefined || c === undefined) {
    throw new RangeError(`Triangle ${triangleId} is incomplete`);
  }
  return [a, b, c];
};

/**
 * Manifold/CSG output can contain zero-area triangles at coincident boolean
 * boundaries. They carry no face or crease information and must not make the
 * projection pipeline fail while normalizing a zero-length cross product.
 */
const triangleNormal = (mesh: CanonicalMesh, triangleId: number): Vec3 => {
  const [ai, bi, ci] = triangleVertices(mesh, triangleId);
  const a = vertex(mesh, ai);
  const raw = cross3(subtract3(vertex(mesh, bi), a), subtract3(vertex(mesh, ci), a));
  const length = Math.hypot(raw[0], raw[1], raw[2]);
  return length <= EPS.length
    ? [0, 0, 0]
    : [raw[0] / length, raw[1] / length, raw[2] / length];
};

const isDegenerateNormal = ([x, y, z]: Vec3): boolean =>
  Math.hypot(x, y, z) <= EPS.length;

const edgeKey = (a: number, b: number): string => a < b ? `${a}:${b}` : `${b}:${a}`;

class DisjointSet {
  readonly #parent: number[];

  public constructor(size: number) {
    this.#parent = Array.from({ length: size }, (_, index) => index);
  }

  public find(value: number): number {
    const parent = this.#parent[value];
    if (parent === undefined) throw new RangeError("Disjoint-set index is invalid");
    if (parent === value) return value;
    const root = this.find(parent);
    this.#parent[value] = root;
    return root;
  }

  public union(a: number, b: number): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.#parent[rootB] = rootA;
  }
}

const featureIdsForTriangles = (
  mesh: CanonicalMesh,
  triangleIds: readonly number[],
): readonly string[] => {
  const ids = new Set<string>();
  for (const group of mesh.groups ?? []) {
    const first = Math.floor(group.start / 3);
    const last = Math.ceil((group.start + group.count) / 3);
    if (triangleIds.some((triangle) => triangle >= first && triangle < last)) ids.add(group.featureId);
  }
  return [...ids].sort();
};

/** Builds logical faces and crease boundaries while suppressing mesh diagonals/facets. */
export const extractLogicalTopology = (
  mesh: CanonicalMesh,
  creaseAngleDegrees = 20,
): LogicalTopology => {
  const triangleNormals = Array.from(
    { length: mesh.triangleCount },
    (_, triangleId) => triangleNormal(mesh, triangleId),
  );
  const validTriangleIds = Array.from({ length: mesh.triangleCount }, (_, triangleId) => triangleId)
    .filter((triangleId) => {
      const normal = triangleNormals[triangleId];
      return normal !== undefined && !isDegenerateNormal(normal);
    });

  const edgeUses = new Map<string, MeshEdgeUse[]>();
  for (const triangleId of validTriangleIds) {
    const [a, b, c] = triangleVertices(mesh, triangleId);
    for (const [first, second] of [[a, b], [b, c], [c, a]] as const) {
      const key = edgeKey(first, second);
      const uses = edgeUses.get(key) ?? [];
      uses.push({ triangleId, a: first, b: second });
      edgeUses.set(key, uses);
    }
  }

  const sets = new DisjointSet(mesh.triangleCount);
  for (const uses of edgeUses.values()) {
    if (uses.length !== 2) continue;
    const first = uses[0];
    const second = uses[1];
    if (first === undefined || second === undefined) continue;
    const firstNormal = triangleNormals[first.triangleId];
    const secondNormal = triangleNormals[second.triangleId];
    if (firstNormal !== undefined && secondNormal !== undefined
      && dot3(firstNormal, secondNormal) >= 1 - EPS.coplanar) {
      sets.union(first.triangleId, second.triangleId);
    }
  }

  const triangleGroups = new Map<number, number[]>();
  for (const triangleId of validTriangleIds) {
    const root = sets.find(triangleId);
    const group = triangleGroups.get(root) ?? [];
    group.push(triangleId);
    triangleGroups.set(root, group);
  }
  const sortedGroups = [...triangleGroups.values()].sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
  const faceByTriangle = new Map<number, LogicalFace>();
  const faces = sortedGroups.map((triangleIds, index): LogicalFace => {
    const face: LogicalFace = {
      id: `face-${index}`,
      triangleIds,
      normal: triangleNormals[triangleIds[0] ?? 0] ?? [0, 0, 1],
      sourceFeatureIds: featureIdsForTriangles(mesh, triangleIds),
    };
    for (const triangleId of triangleIds) faceByTriangle.set(triangleId, face);
    return face;
  });

  const creaseCosine = Math.cos(creaseAngleDegrees * Math.PI / 180);
  const edges: LogicalEdge[] = [];
  for (const [key, uses] of [...edgeUses.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const first = uses[0];
    if (first === undefined) continue;
    const adjacentFaces = [...new Set(uses.flatMap(({ triangleId }) => {
      const face = faceByTriangle.get(triangleId);
      return face === undefined ? [] : [face];
    }))];
    if (adjacentFaces.length === 1 && uses.length === 2) continue;
    if (uses.length === 2) {
      const firstNormal = triangleNormals[uses[0]?.triangleId ?? 0];
      const secondNormal = triangleNormals[uses[1]?.triangleId ?? 0];
      if (firstNormal !== undefined && secondNormal !== undefined
        && dot3(firstNormal, secondNormal) > creaseCosine) continue;
    }
    const sourceFeatureIds = [...new Set(adjacentFaces.flatMap(({ sourceFeatureIds }) => sourceFeatureIds))].sort();
    edges.push({
      id: `edge-${key}`,
      vertices: { a: vertex(mesh, first.a), b: vertex(mesh, first.b) },
      adjacentFaceIds: adjacentFaces.map(({ id }) => id).sort(),
      sourceFeatureIds,
      kind: uses.length === 1 ? "boundary" : "crease",
    });
  }
  return { faces, edges, triangleNormals };
};
