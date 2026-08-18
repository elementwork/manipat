import type { Vec3 } from "@manipat/core";
import type { CanonicalMesh } from "@manipat/geometry";

export type RuntimeVisualizationCategory =
  | "aperture"
  | "view-recognition"
  | "cube-counting"
  | "form-development";

export type RuntimeViewPreset = "isometric" | "front" | "top" | "right-end";

export interface SerializedCanonicalMesh {
  readonly positions: readonly number[];
  readonly indices: readonly number[];
  readonly vertexCount: number;
  readonly triangleCount: number;
  readonly groups?: readonly {
    readonly featureId: string;
    readonly start: number;
    readonly count: number;
  }[];
  readonly bounds: {
    readonly min: Vec3;
    readonly max: Vec3;
  };
}

interface RuntimeVisualizationBase {
  readonly questionId: string;
  readonly category: RuntimeVisualizationCategory;
  readonly title: string;
  readonly cameraPresets: readonly RuntimeViewPreset[];
}

export interface RuntimeMeshVisualization extends RuntimeVisualizationBase {
  readonly kind: "mesh";
  readonly mesh: SerializedCanonicalMesh;
  /** Optional rotation that aligns the object with the scored target projection. */
  readonly targetRotationDegrees?: Vec3;
  /** Feature groups to reveal as an explanation overlay. */
  readonly highlightFeatureIds?: readonly string[];
}

export interface RuntimeVoxelVisualization extends RuntimeVisualizationBase {
  readonly kind: "voxels";
  readonly positions: readonly Vec3[];
  /** Voxel indices to reveal as the answer/explanation. */
  readonly highlightIndices?: readonly number[];
}

export type RuntimeVisualizationPayload =
  | RuntimeMeshVisualization
  | RuntimeVoxelVisualization;

export const serializeCanonicalMesh = (mesh: CanonicalMesh): SerializedCanonicalMesh => ({
  positions: Array.from(mesh.positions),
  indices: Array.from(mesh.indices),
  vertexCount: mesh.vertexCount,
  triangleCount: mesh.triangleCount,
  ...(mesh.groups === undefined ? {} : { groups: mesh.groups }),
  bounds: mesh.bounds,
});

export const deserializeCanonicalMesh = (mesh: SerializedCanonicalMesh): CanonicalMesh => ({
  positions: Float32Array.from(mesh.positions),
  indices: Uint32Array.from(mesh.indices),
  vertexCount: mesh.vertexCount,
  triangleCount: mesh.triangleCount,
  ...(mesh.groups === undefined ? {} : { groups: mesh.groups }),
  bounds: mesh.bounds,
});

export interface IndexedPolygonFace {
  readonly id: string;
  readonly vertexIds: readonly number[];
}

const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const average = (points: readonly Vec3[]): Vec3 => {
  if (points.length === 0) throw new RangeError("Cannot average an empty point set");
  return [
    points.reduce((sum, [x]) => sum + x, 0) / points.length,
    points.reduce((sum, [, y]) => sum + y, 0) / points.length,
    points.reduce((sum, [, , z]) => sum + z, 0) / points.length,
  ];
};

const outwardVertexIds = (
  vertices: readonly Vec3[],
  vertexIds: readonly number[],
  solidCenter: Vec3,
): readonly number[] => {
  const points = vertexIds.map((id) => {
    const point = vertices[id];
    if (point === undefined) throw new RangeError(`Face references missing vertex ${id}`);
    return point;
  });
  const a = points[0];
  const b = points[1];
  const c = points[2];
  if (a === undefined || b === undefined || c === undefined) {
    throw new RangeError("Polyhedron faces must contain at least three vertices");
  }
  const normal = cross(subtract(b, a), subtract(c, a));
  const faceCenter = average(points);
  return dot(normal, subtract(faceCenter, solidCenter)) >= 0
    ? vertexIds
    : [...vertexIds].reverse();
};

/**
 * Convert a logical polyhedron into a canonical triangular mesh suitable for
 * the shared pictorial renderer. Face winding is normalized outward so legacy
 * or procedurally generated face lists remain visible with one-sided materials.
 */
export const indexedFacesToCanonicalMesh = (
  vertices: readonly Vec3[],
  faces: readonly IndexedPolygonFace[],
): CanonicalMesh => {
  if (vertices.length < 4) throw new RangeError("A runtime polyhedron requires at least four vertices");
  if (faces.length === 0) throw new RangeError("A runtime polyhedron requires at least one face");
  const solidCenter = average(vertices);
  const indices: number[] = [];
  const groups: Array<{ featureId: string; start: number; count: number }> = [];

  for (const face of faces) {
    if (face.vertexIds.length < 3) throw new RangeError(`Face ${face.id} has fewer than three vertices`);
    const oriented = outwardVertexIds(vertices, face.vertexIds, solidCenter);
    const first = oriented[0];
    if (first === undefined) continue;
    const start = indices.length;
    for (let index = 1; index < oriented.length - 1; index += 1) {
      const second = oriented[index];
      const third = oriented[index + 1];
      if (second === undefined || third === undefined) continue;
      indices.push(first, second, third);
    }
    groups.push({ featureId: face.id, start, count: indices.length - start });
  }

  const xs = vertices.map(([x]) => x);
  const ys = vertices.map(([, y]) => y);
  const zs = vertices.map(([, , z]) => z);
  return {
    positions: Float32Array.from(vertices.flatMap(([x, y, z]) => [x, y, z])),
    indices: Uint32Array.from(indices),
    vertexCount: vertices.length,
    triangleCount: indices.length / 3,
    groups,
    bounds: {
      min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)],
      max: [Math.max(...xs), Math.max(...ys), Math.max(...zs)],
    },
  };
};
