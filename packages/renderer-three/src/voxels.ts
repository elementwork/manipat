import type { Vec3 } from "@manipat/core";
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type ColorRepresentation,
} from "three";
import {
  createDepthOccluderMaterial,
  createExamEdgeMaterial,
  createHiddenEdgeMaterial,
} from "./materials.js";

export interface VoxelInstancedRender extends Disposable {
  readonly mesh: InstancedMesh;
  readonly depthOccluder: InstancedMesh;
  readonly edges: LineSegments;
  readonly hiddenEdges: LineSegments;
  readonly disposed: boolean;
  setGhosted(ghosted: boolean): void;
  setSurfaceVisible(visible: boolean): void;
  setEdgesVisible(visible: boolean): void;
  setHighlighted(indices: readonly number[], color?: ColorRepresentation): void;
  clearHighlight(): void;
  dispose(): void;
}

const positionKey = ([x, y, z]: Vec3): string => `${x},${y},${z}`;
const vertexKey = ([x, y, z]: Vec3): string => `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
const edgeKey = (first: Vec3, second: Vec3): string => {
  const a = vertexKey(first);
  const b = vertexKey(second);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
};

interface FaceDefinition {
  readonly neighbor: Vec3;
  readonly corners: readonly [Vec3, Vec3, Vec3, Vec3];
}

const faceDefinitions = (half: number): readonly FaceDefinition[] => [
  { neighbor: [1, 0, 0], corners: [[half, -half, -half], [half, half, -half], [half, half, half], [half, -half, half]] },
  { neighbor: [-1, 0, 0], corners: [[-half, -half, -half], [-half, -half, half], [-half, half, half], [-half, half, -half]] },
  { neighbor: [0, 1, 0], corners: [[-half, half, -half], [-half, half, half], [half, half, half], [half, half, -half]] },
  { neighbor: [0, -1, 0], corners: [[-half, -half, -half], [half, -half, -half], [half, -half, half], [-half, -half, half]] },
  { neighbor: [0, 0, 1], corners: [[-half, -half, half], [half, -half, half], [half, half, half], [-half, half, half]] },
  { neighbor: [0, 0, -1], corners: [[-half, -half, -half], [-half, half, -half], [half, half, -half], [half, -half, -half]] },
];

const addVec3 = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/**
 * Build cube-counting linework from the edges of exposed faces. This preserves
 * seams between adjacent visible cubes (important for counting) while dropping
 * edges that are completely buried inside the voxel stack.
 */
const createVoxelEdgeGeometry = (positions: readonly Vec3[], size: number): BufferGeometry => {
  const occupied = new Set(positions.map(positionKey));
  const edges = new Map<string, readonly [Vec3, Vec3]>();
  const faces = faceDefinitions(size / 2);
  for (const position of positions) {
    for (const face of faces) {
      if (occupied.has(positionKey(addVec3(position, face.neighbor)))) continue;
      const corners = face.corners.map((corner) => addVec3(position, corner)) as [Vec3, Vec3, Vec3, Vec3];
      for (let index = 0; index < 4; index += 1) {
        const first = corners[index];
        const second = corners[(index + 1) % 4];
        if (first === undefined || second === undefined) continue;
        edges.set(edgeKey(first, second), [first, second]);
      }
    }
  }
  const values: number[] = [];
  for (const [first, second] of edges.values()) values.push(...first, ...second);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(values, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
};

const createVoxelSurfaceMaterial = (ghosted: boolean): MeshStandardMaterial => new MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.78,
  metalness: 0,
  transparent: ghosted,
  opacity: ghosted ? 0.18 : 1,
  depthWrite: !ghosted,
});

class OwnedVoxelRender implements VoxelInstancedRender {
  public readonly mesh: InstancedMesh;
  public readonly depthOccluder: InstancedMesh;
  public readonly edges: LineSegments;
  public readonly hiddenEdges: LineSegments;
  readonly #baseColor: Color;
  readonly #edgeGeometry: BufferGeometry;
  #ghosted = false;
  #edgesVisible = true;
  #disposed = false;

  public constructor(positions: readonly Vec3[], size: number, color: ColorRepresentation) {
    const geometry = new BoxGeometry(size, size, size);
    this.mesh = new InstancedMesh(geometry, createVoxelSurfaceMaterial(false), positions.length);
    this.mesh.name = "voxel-surfaces";
    this.#baseColor = new Color(color);
    this.depthOccluder = new InstancedMesh(geometry, createDepthOccluderMaterial(), positions.length);
    this.depthOccluder.name = "voxel-depth-occluder";
    this.depthOccluder.visible = false;
    this.depthOccluder.renderOrder = -2;

    const matrix = new Matrix4();
    positions.forEach(([x, y, z], index) => {
      matrix.makeTranslation(x, y, z);
      this.mesh.setMatrixAt(index, matrix);
      this.mesh.setColorAt(index, this.#baseColor);
      this.depthOccluder.setMatrixAt(index, matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    this.depthOccluder.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor !== null) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.computeBoundingBox();
    this.mesh.computeBoundingSphere();
    this.depthOccluder.computeBoundingBox();
    this.depthOccluder.computeBoundingSphere();

    this.#edgeGeometry = createVoxelEdgeGeometry(positions, size);
    this.edges = new LineSegments(this.#edgeGeometry, createExamEdgeMaterial());
    this.edges.name = "voxel-visible-edges";
    this.edges.renderOrder = 2;
    this.hiddenEdges = new LineSegments(
      this.#edgeGeometry,
      createHiddenEdgeMaterial(Math.max(size * 0.22, 0.05), Math.max(size * 0.14, 0.035)),
    );
    this.hiddenEdges.name = "voxel-hidden-edges";
    this.hiddenEdges.computeLineDistances();
    this.hiddenEdges.visible = false;
    this.hiddenEdges.renderOrder = 1;
  }

  public get disposed(): boolean {
    return this.#disposed;
  }

  #assertActive(): void {
    if (this.#disposed) throw new ReferenceError("Voxel render has been disposed");
  }

  public setGhosted(ghosted: boolean): void {
    this.#assertActive();
    this.#ghosted = ghosted;
    const previous = this.mesh.material;
    this.mesh.material = createVoxelSurfaceMaterial(ghosted);
    if (!Array.isArray(previous)) previous.dispose();
    this.depthOccluder.visible = ghosted && this.#edgesVisible;
    this.hiddenEdges.visible = ghosted && this.#edgesVisible;
  }

  public setSurfaceVisible(visible: boolean): void {
    this.#assertActive();
    this.mesh.visible = visible;
  }

  public setEdgesVisible(visible: boolean): void {
    this.#assertActive();
    this.#edgesVisible = visible;
    this.edges.visible = visible;
    this.hiddenEdges.visible = visible && this.#ghosted;
    this.depthOccluder.visible = visible && this.#ghosted;
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
    this.#edgeGeometry.dispose();
    const material = this.mesh.material;
    if (!Array.isArray(material)) material.dispose();
    const depthMaterial = this.depthOccluder.material;
    if (depthMaterial instanceof MeshBasicMaterial) depthMaterial.dispose();
    const edgeMaterial = this.edges.material;
    if (edgeMaterial instanceof LineBasicMaterial) edgeMaterial.dispose();
    const hiddenMaterial = this.hiddenEdges.material;
    if (hiddenMaterial instanceof LineDashedMaterial) hiddenMaterial.dispose();
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
