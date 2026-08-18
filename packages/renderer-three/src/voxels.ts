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
  setHighlighted(indices: readonly number[], color?: ColorRepresentation): void;
  clearHighlight(): void;
  dispose(): void;
}

class OwnedVoxelRender implements VoxelInstancedRender {
  public readonly mesh: InstancedMesh;
  readonly #baseColor: Color;
  #disposed = false;

  public constructor(positions: readonly Vec3[], size: number, color: ColorRepresentation) {
    const geometry = new BoxGeometry(size, size, size);
    const material = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
    this.mesh = new InstancedMesh(geometry, material, positions.length);
    this.#baseColor = new Color(color);
    const matrix = new Matrix4();
    positions.forEach(([x, y, z], index) => {
      matrix.makeTranslation(x, y, z);
      this.mesh.setMatrixAt(index, matrix);
      this.mesh.setColorAt(index, this.#baseColor);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor !== null) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.computeBoundingBox();
    this.mesh.computeBoundingSphere();
  }

  public get disposed(): boolean {
    return this.#disposed;
  }

  #assertActive(): void {
    if (this.#disposed) throw new ReferenceError("Voxel render has been disposed");
  }

  public setHighlighted(
    indices: readonly number[],
    color: ColorRepresentation = 0xffb000,
  ): void {
    this.#assertActive();
    this.clearHighlight();
    const highlight = new Color(color);
    for (const index of indices) {
      if (!Number.isInteger(index) || index < 0 || index >= this.mesh.count) {
        throw new RangeError(`Voxel index ${index} is outside the instanced mesh`);
      }
      this.mesh.setColorAt(index, highlight);
    }
    if (this.mesh.instanceColor !== null) this.mesh.instanceColor.needsUpdate = true;
  }

  public clearHighlight(): void {
    this.#assertActive();
    for (let index = 0; index < this.mesh.count; index += 1) {
      this.mesh.setColorAt(index, this.#baseColor);
    }
    if (this.mesh.instanceColor !== null) this.mesh.instanceColor.needsUpdate = true;
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
