import type { Vec3 } from "@manipat/core";
import {
  BoxGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  type ColorRepresentation,
} from "three";

export interface VoxelInstancedRender extends Disposable {
  readonly mesh: InstancedMesh;
  readonly disposed: boolean;
}

class OwnedVoxelRender implements VoxelInstancedRender {
  public readonly mesh: InstancedMesh;
  #disposed = false;

  public constructor(positions: readonly Vec3[], size: number, color: ColorRepresentation) {
    const geometry = new BoxGeometry(size, size, size);
    const material = new MeshStandardMaterial({ color: new Color(color), roughness: 0.82 });
    this.mesh = new InstancedMesh(geometry, material, positions.length);
    const matrix = new Matrix4();
    positions.forEach(([x, y, z], index) => {
      matrix.makeTranslation(x, y, z);
      this.mesh.setMatrixAt(index, matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.computeBoundingBox();
    this.mesh.computeBoundingSphere();
  }

  public get disposed(): boolean {
    return this.#disposed;
  }

  public dispose(): void {
    if (this.#disposed) return;
    this.mesh.geometry.dispose();
    const material = this.mesh.material;
    if (!Array.isArray(material)) material.dispose();
    this.#disposed = true;
  }

  public [Symbol.dispose](): void {
    this.dispose();
  }
}

export const createVoxelInstancedRender = (
  positions: readonly Vec3[],
  size = 1,
  color: ColorRepresentation = 0xd9dde3,
): VoxelInstancedRender => {
  if (!Number.isFinite(size) || size <= 0) throw new RangeError("Voxel size must be positive");
  return new OwnedVoxelRender(positions, size, color);
};
