import type { CanonicalMesh } from "@manipat/geometry";
import { BufferGeometry, Float32BufferAttribute } from "three";

/**
 * Converts a copied canonical mesh into an owned Three.js geometry.
 * The caller must invoke `dispose()` when the geometry is no longer needed.
 */
export const manifoldMeshToBufferGeometry = (
  mesh: CanonicalMesh,
): BufferGeometry => {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(mesh.positions, 3));
  geometry.setIndex(Array.from(mesh.indices));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
};
