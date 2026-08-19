import type { CanonicalMesh } from "@manipat/geometry";
import {
  Color,
  Float32BufferAttribute,
  Vector3,
  type BufferGeometry,
  type ColorRepresentation,
} from "three";
import {
  createPictorialPreview,
  type PictorialPreview,
  type PictorialPreviewOptions,
} from "./scene.js";

type SemanticSurfaceKind = "body" | "protrusion" | "recess" | "terminal";

const SEMANTIC_COLORS: Readonly<Record<SemanticSurfaceKind, ColorRepresentation>> = {
  body: 0xd9dde3,
  protrusion: 0xb9d7f0,
  recess: 0xf0b7aa,
  terminal: 0xf2d38b,
};

const FEATURE_HINTS: Readonly<Record<Exclude<SemanticSurfaceKind, "body">, readonly string[]>> = {
  terminal: ["blind", "bottom", "floor", "terminal"],
  recess: ["hole", "bore", "recess", "notch", "slot", "groove", "cut", "cavity", "pocket"],
  protrusion: ["boss", "bump", "protr", "peg", "tab", "lobe", "post", "raised"],
};

const semanticKindFromFeatureId = (
  featureId: string,
): Exclude<SemanticSurfaceKind, "body"> | undefined => {
  const normalized = featureId.toLowerCase();
  for (const kind of ["terminal", "recess", "protrusion"] as const) {
    if (FEATURE_HINTS[kind].some((token) => normalized.includes(token))) return kind;
  }
  return undefined;
};

interface TriangleInfo {
  readonly indices: readonly [number, number, number];
  readonly normal: Vector3;
  readonly centroid: Vector3;
  readonly area: number;
}

interface SurfacePatch {
  readonly triangleIndices: readonly number[];
  readonly area: number;
  readonly averageNormal: Vector3;
  readonly centroid: Vector3;
  readonly planar: boolean;
}

const framingRadius = (mesh: CanonicalMesh): number => {
  const dimensions = mesh.bounds.max.map(
    (maximum, index) => maximum - (mesh.bounds.min[index] ?? 0),
  );
  return Math.hypot(...dimensions) / 2;
};

const meshPoint = (mesh: CanonicalMesh, index: number): Vector3 => new Vector3(
  mesh.positions[index * 3] ?? 0,
  mesh.positions[index * 3 + 1] ?? 0,
  mesh.positions[index * 3 + 2] ?? 0,
);

const triangleInfo = (mesh: CanonicalMesh): readonly TriangleInfo[] => {
  const result: TriangleInfo[] = [];
  for (let triangleIndex = 0; triangleIndex < mesh.triangleCount; triangleIndex += 1) {
    const aIndex = mesh.indices[triangleIndex * 3];
    const bIndex = mesh.indices[triangleIndex * 3 + 1];
    const cIndex = mesh.indices[triangleIndex * 3 + 2];
    if (aIndex === undefined || bIndex === undefined || cIndex === undefined) {
      throw new RangeError("Mesh index buffer is incomplete");
    }
    const a = meshPoint(mesh, aIndex);
    const b = meshPoint(mesh, bIndex);
    const c = meshPoint(mesh, cIndex);
    const cross = b.clone().sub(a).cross(c.clone().sub(a));
    const area = cross.length() / 2;
    const normal = area <= 1e-12 ? new Vector3(0, 0, 1) : cross.normalize();
    result.push({
      indices: [aIndex, bIndex, cIndex],
      normal,
      centroid: a.clone().add(b).add(c).multiplyScalar(1 / 3),
      area,
    });
  }
  return result;
};

const triangleAdjacency = (
  triangles: readonly TriangleInfo[],
): readonly ReadonlySet<number>[] => {
  const byEdge = new Map<string, number[]>();
  triangles.forEach(({ indices }, triangleIndex) => {
    const edges = [
      [indices[0], indices[1]],
      [indices[1], indices[2]],
      [indices[2], indices[0]],
    ] as const;
    for (const [first, second] of edges) {
      const key = first < second ? `${first}:${second}` : `${second}:${first}`;
      const entries = byEdge.get(key) ?? [];
      entries.push(triangleIndex);
      byEdge.set(key, entries);
    }
  });
  const result = triangles.map(() => new Set<number>());
  for (const entries of byEdge.values()) {
    for (const first of entries) {
      for (const second of entries) if (first !== second) result[first]?.add(second);
    }
  }
  return result;
};

/**
 * Group adjacent triangles into visual surface patches before assigning fallback
 * semantics. A planar quad therefore receives one color as a face, never two
 * unrelated colors from its triangulation halves.
 */
const buildSurfacePatches = (
  triangles: readonly TriangleInfo[],
  adjacency: readonly ReadonlySet<number>[],
): { readonly patches: readonly SurfacePatch[]; readonly patchForTriangle: readonly number[] } => {
  const patchForTriangle = triangles.map(() => -1);
  const patches: SurfacePatch[] = [];
  const smoothThreshold = 0.94;
  for (let start = 0; start < triangles.length; start += 1) {
    if ((patchForTriangle[start] ?? -1) >= 0) continue;
    const patchIndex = patches.length;
    const queue = [start];
    const members: number[] = [];
    patchForTriangle[start] = patchIndex;
    while (queue.length > 0) {
      const current = queue.pop();
      if (current === undefined) break;
      members.push(current);
      const triangle = triangles[current];
      if (triangle === undefined) continue;
      for (const neighbor of adjacency[current] ?? []) {
        if ((patchForTriangle[neighbor] ?? -1) >= 0) continue;
        const other = triangles[neighbor];
        if (other === undefined || triangle.normal.dot(other.normal) < smoothThreshold) continue;
        patchForTriangle[neighbor] = patchIndex;
        queue.push(neighbor);
      }
    }
    let area = 0;
    const averageNormal = new Vector3();
    const centroid = new Vector3();
    for (const triangleIndex of members) {
      const triangle = triangles[triangleIndex];
      if (triangle === undefined) continue;
      area += triangle.area;
      averageNormal.addScaledVector(triangle.normal, triangle.area);
      centroid.addScaledVector(triangle.centroid, triangle.area);
    }
    if (area > 0) centroid.multiplyScalar(1 / area);
    if (averageNormal.lengthSq() > 0) averageNormal.normalize();
    const planar = members.every((triangleIndex) => {
      const triangle = triangles[triangleIndex];
      return triangle !== undefined && triangle.normal.dot(averageNormal) >= 0.995;
    });
    patches.push({ triangleIndices: members, area, averageNormal, centroid, planar });
  }
  return { patches, patchForTriangle };
};

const patchBoundaryNeighborCounts = (
  adjacency: readonly ReadonlySet<number>[],
  patchForTriangle: readonly number[],
  patchCount: number,
): readonly ReadonlyMap<number, number>[] => {
  const result = Array.from({ length: patchCount }, () => new Map<number, number>());
  adjacency.forEach((adjacent, triangleIndex) => {
    const patch = patchForTriangle[triangleIndex];
    if (patch === undefined || patch < 0) return;
    for (const neighbor of adjacent) {
      const other = patchForTriangle[neighbor];
      if (other === undefined || other < 0 || other === patch) continue;
      const counts = result[patch];
      if (counts !== undefined) counts.set(other, (counts.get(other) ?? 0) + 1);
    }
  });
  return result;
};

const isExteriorPlanePatch = (
  mesh: CanonicalMesh,
  patch: SurfacePatch,
  tolerance: number,
): boolean => {
  const components = [
    Math.abs(patch.averageNormal.x),
    Math.abs(patch.averageNormal.y),
    Math.abs(patch.averageNormal.z),
  ];
  const dominant = components.indexOf(Math.max(...components));
  if ((components[dominant] ?? 0) < 0.96) return false;
  const coordinate = patch.centroid.getComponent(dominant);
  return Math.abs(coordinate - (mesh.bounds.min[dominant] ?? 0)) <= tolerance
    || Math.abs(coordinate - (mesh.bounds.max[dominant] ?? 0)) <= tolerance;
};

export const classifySemanticSurfacePatches = (
  mesh: CanonicalMesh,
): readonly SemanticSurfaceKind[] => {
  const triangles = triangleInfo(mesh);
  const adjacency = triangleAdjacency(triangles);
  const { patches, patchForTriangle } = buildSurfacePatches(triangles, adjacency);
  const neighbors = patchBoundaryNeighborCounts(adjacency, patchForTriangle, patches.length);
  const center = new Vector3(
    (mesh.bounds.min[0] + mesh.bounds.max[0]) / 2,
    (mesh.bounds.min[1] + mesh.bounds.max[1]) / 2,
    (mesh.bounds.min[2] + mesh.bounds.max[2]) / 2,
  );
  const radius = Math.max(framingRadius(mesh), 1e-6);
  const radialTolerance = Math.max(radius * 0.018, 1e-6);
  const planeTolerance = Math.max(radius * 0.015, 1e-6);
  const minimumPatchArea = Math.max(radius * radius * 0.0004, 1e-8);
  const patchKinds: SemanticSurfaceKind[] = patches.map(() => "body");
  const explicitKinds = patches.map(() => new Set<Exclude<SemanticSurfaceKind, "body">>());

  for (const group of mesh.groups ?? []) {
    const kind = semanticKindFromFeatureId(group.featureId);
    if (kind === undefined) continue;
    const firstTriangle = Math.floor(group.start / 3);
    const triangleCount = Math.floor(group.count / 3);
    for (let offset = 0; offset < triangleCount; offset += 1) {
      const patchIndex = patchForTriangle[firstTriangle + offset];
      if (patchIndex !== undefined && patchIndex >= 0) explicitKinds[patchIndex]?.add(kind);
    }
  }
  explicitKinds.forEach((kinds, patchIndex) => {
    if (kinds.has("terminal")) patchKinds[patchIndex] = "terminal";
    else if (kinds.has("recess")) patchKinds[patchIndex] = "recess";
    else if (kinds.has("protrusion")) patchKinds[patchIndex] = "protrusion";
  });

  // Without provenance, only infer cavity/recess patches. We intentionally do
  // not guess raised/boss surfaces: the previous curvature heuristic colored
  // unrelated exterior patches blue and was not reliable enough for teaching.
  patches.forEach((patch, patchIndex) => {
    if ((explicitKinds[patchIndex]?.size ?? 0) > 0 || patch.area < minimumPatchArea) return;
    let inwardArea = 0;
    for (const triangleIndex of patch.triangleIndices) {
      const triangle = triangles[triangleIndex];
      if (triangle === undefined) continue;
      const radial = triangle.centroid.clone().sub(center).dot(triangle.normal);
      if (radial < -radialTolerance) inwardArea += triangle.area;
    }
    if (patch.area > 0 && inwardArea / patch.area >= 0.8) patchKinds[patchIndex] = "recess";
  });

  // Infer a blind-hole/recess floor only as a complete planar patch with a
  // strong boundary relationship to an identified recess. This prevents amber
  // single triangles on ordinary rectangular faces.
  patches.forEach((patch, patchIndex) => {
    if ((explicitKinds[patchIndex]?.size ?? 0) > 0 || patchKinds[patchIndex] !== "body") return;
    if (!patch.planar || patch.area < minimumPatchArea || isExteriorPlanePatch(mesh, patch, planeTolerance)) return;
    const counts = neighbors[patchIndex] ?? new Map<number, number>();
    let totalBoundaryLinks = 0;
    let recessBoundaryLinks = 0;
    for (const [neighborPatch, count] of counts) {
      totalBoundaryLinks += count;
      if (patchKinds[neighborPatch] === "recess") recessBoundaryLinks += count;
    }
    if (recessBoundaryLinks >= 2
      && totalBoundaryLinks > 0
      && recessBoundaryLinks / totalBoundaryLinks >= 0.6) {
      patchKinds[patchIndex] = "terminal";
    }
  });

  return triangles.map((_, triangleIndex) => {
    const patchIndex = patchForTriangle[triangleIndex];
    return patchIndex === undefined || patchIndex < 0 ? "body" : patchKinds[patchIndex] ?? "body";
  });
};

const createPatchSemanticGeometry = (
  mesh: CanonicalMesh,
  surfaceGeometry: BufferGeometry,
): BufferGeometry => {
  // toNonIndexed copies the already-computed smooth normals from the neutral
  // surface. This avoids introducing a visible triangle-facet pattern merely
  // because the semantic overlay needs per-face colors.
  const geometry = surfaceGeometry.toNonIndexed();
  const colors: number[] = [];
  const kinds = classifySemanticSurfacePatches(mesh);
  for (let triangleIndex = 0; triangleIndex < mesh.triangleCount; triangleIndex += 1) {
    const color = new Color(SEMANTIC_COLORS[kinds[triangleIndex] ?? "body"]);
    for (let corner = 0; corner < 3; corner += 1) colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geometry;
};

/**
 * Create the ordinary pictorial preview but replace its semantic overlay with
 * patch-based classification. The neutral/canonical scene implementation stays
 * untouched; this wrapper owns and disposes only the replacement color geometry.
 */
export const createLearningPictorialPreview = (
  mesh: CanonicalMesh,
  options: PictorialPreviewOptions = {},
): PictorialPreview => {
  const preview = createPictorialPreview(mesh, options);
  const replacement = createPatchSemanticGeometry(mesh, preview.surface.geometry);
  preview.semanticSurface.geometry = replacement;
  const originalDispose = preview.dispose.bind(preview);
  let replacementDisposed = false;
  preview.dispose = (): void => {
    if (!replacementDisposed) {
      replacement.dispose();
      replacementDisposed = true;
    }
    originalDispose();
  };
  return preview;
};
