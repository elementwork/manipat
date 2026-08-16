import type { Vec3 } from "@manipat/core";
import type { CanonicalMesh } from "@manipat/geometry";
import { createPictorialPreview, type PictorialPreview } from "@manipat/renderer-three";
import type { LogicalPolyhedron } from "./types.js";

export const logicalPolyhedronMesh = (polyhedron: LogicalPolyhedron): CanonicalMesh => {
  const indices: number[] = [];
  const groups: NonNullable<CanonicalMesh["groups"]>[number][] = [];
  for (const face of polyhedron.faces) {
    const start = indices.length;
    const first = face.vertexIds[0];
    if (first === undefined) continue;
    for (let corner = 1; corner < face.vertexIds.length - 1; corner += 1) {
      indices.push(first, face.vertexIds[corner]!, face.vertexIds[corner + 1]!);
    }
    groups.push({ featureId: face.id, start, count: indices.length - start });
  }
  const coordinates = polyhedron.vertices.flatMap((vertex) => vertex);
  const min: Vec3 = [
    Math.min(...polyhedron.vertices.map(([x]) => x)),
    Math.min(...polyhedron.vertices.map(([, y]) => y)),
    Math.min(...polyhedron.vertices.map(([, , z]) => z)),
  ];
  const max: Vec3 = [
    Math.max(...polyhedron.vertices.map(([x]) => x)),
    Math.max(...polyhedron.vertices.map(([, y]) => y)),
    Math.max(...polyhedron.vertices.map(([, , z]) => z)),
  ];
  return {
    positions: new Float32Array(coordinates),
    indices: new Uint32Array(indices),
    vertexCount: polyhedron.vertices.length,
    triangleCount: indices.length / 3,
    groups,
    bounds: { min, max },
  };
};

export const createFormDevelopmentPreview = (
  polyhedron: LogicalPolyhedron,
): PictorialPreview => createPictorialPreview(logicalPolyhedronMesh(polyhedron));
