import type { Vec3 } from "@manipat/core";
import type { CanonicalMesh } from "@manipat/geometry";
import {
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  Vector3,
  type ColorRepresentation,
  type OrthographicCamera,
} from "three";
import { createIsometricOrthographicCamera } from "./cameras.js";
import {
  createDepthOccluderMaterial,
  createExamEdgeMaterial,
  createExamSurfaceMaterial,
  createHiddenEdgeMaterial,
  createHighlightMaterial,
  type ExamMaterialOptions,
} from "./materials.js";
import { manifoldMeshToBufferGeometry } from "./mesh-adapter.js";

export interface PictorialPreviewOptions extends ExamMaterialOptions {
  readonly background?: ColorRepresentation;
  readonly edgeThresholdDegrees?: number;
  readonly paddingFactor?: number;
}

export interface PictorialPreview extends Disposable {
  readonly scene: Scene;
  readonly camera: OrthographicCamera;
  readonly object: Group;
  readonly surface: Mesh;
  readonly edges: LineSegments;
  readonly hiddenEdges: LineSegments;
  readonly disposed: boolean;
  setRotation(degreesXYZ: Vec3): void;
  setGhosted(ghosted: boolean): void;
  setEdgesVisible(visible: boolean): void;
  highlightTriangles(triangleIndices: readonly number[], color?: ColorRepresentation): void;
  highlightFeature(featureId: string, color?: ColorRepresentation): void;
  clearHighlight(): void;
  addProjectionPlane(size?: number): Mesh;
  dispose(): void;
}

const degreesToRadians = (degrees: number): number => degrees * Math.PI / 180;

const framingRadius = (mesh: CanonicalMesh): number => {
  const dimensions = mesh.bounds.max.map(
    (maximum, index) => maximum - (mesh.bounds.min[index] ?? 0),
  );
  return Math.hypot(...dimensions) / 2;
};

class ThreePictorialPreview implements PictorialPreview {
  public readonly scene: Scene;
  public readonly camera: OrthographicCamera;
  public readonly object: Group;
  public readonly surface: Mesh;
  public readonly edges: LineSegments;
  public readonly hiddenEdges: LineSegments;
  readonly #depthOccluder: Mesh;
  readonly #canonicalMesh: CanonicalMesh;
  readonly #surfaceGeometry: BufferGeometry;
  readonly #edgeGeometry: EdgesGeometry;
  #highlight: Mesh | undefined;
  #projectionPlanes: Mesh[] = [];
  #edgesVisible = true;
  #disposed = false;

  public constructor(mesh: CanonicalMesh, options: PictorialPreviewOptions) {
    this.#canonicalMesh = mesh;
    const radius = framingRadius(mesh);
    const paddingFactor = options.paddingFactor ?? 1.25;
    const distance = Math.max(radius * 4, 200);
    this.camera = createIsometricOrthographicCamera({
      viewSize: radius * 2 * paddingFactor,
      distance,
      near: Math.max(0.1, distance - radius * 2),
      far: distance + radius * 2,
    });
    this.scene = new Scene();
    if (options.background !== undefined) this.scene.background = new Color(options.background);
    this.object = new Group();
    const center = new Vector3(
      (mesh.bounds.min[0] + mesh.bounds.max[0]) / 2,
      (mesh.bounds.min[1] + mesh.bounds.max[1]) / 2,
      (mesh.bounds.min[2] + mesh.bounds.max[2]) / 2,
    );
    this.object.position.copy(center.multiplyScalar(-1));
    this.#surfaceGeometry = manifoldMeshToBufferGeometry(mesh);

    // The invisible depth pre-pass lets Ghost mode distinguish visible edges
    // from edges occluded by the nearest surface.
    this.#depthOccluder = new Mesh(this.#surfaceGeometry, createDepthOccluderMaterial());
    this.#depthOccluder.name = "depth-occluder";
    this.#depthOccluder.renderOrder = -2;

    this.surface = new Mesh(this.#surfaceGeometry, createExamSurfaceMaterial(options));
    this.surface.renderOrder = -1;

    this.#edgeGeometry = new EdgesGeometry(
      this.#surfaceGeometry,
      options.edgeThresholdDegrees ?? 20,
    );
    const dashSize = Math.max(radius * 0.035, 0.02);
    const gapSize = Math.max(radius * 0.022, 0.012);
    this.hiddenEdges = new LineSegments(
      this.#edgeGeometry,
      createHiddenEdgeMaterial(dashSize, gapSize),
    );
    this.hiddenEdges.name = "hidden-edges";
    this.hiddenEdges.computeLineDistances();
    this.hiddenEdges.visible = options.ghosted === true;
    this.hiddenEdges.renderOrder = 1;

    this.edges = new LineSegments(this.#edgeGeometry, createExamEdgeMaterial());
    this.edges.name = "visible-edges";
    this.edges.renderOrder = 2;

    this.object.add(this.#depthOccluder, this.surface, this.hiddenEdges, this.edges);
    this.scene.add(this.object);

    // Lower ambient wash and cross-lighting make cylindrical recesses, blind
    // holes, and interior walls read with much stronger depth than the former
    // high-ambient setup while keeping the neutral exam-style material.
    this.scene.add(new HemisphereLight(0xffffff, 0x7b8490, 0.72));
    const key = new DirectionalLight(0xffffff, 1.55);
    key.position.set(2, -3, 4);
    this.scene.add(key);
    const fill = new DirectionalLight(0xb9d2ff, 0.38);
    fill.position.set(-3, 2, 1);
    this.scene.add(fill);
  }

  public get disposed(): boolean {
    return this.#disposed;
  }

  #assertActive(): void {
    if (this.#disposed) throw new ReferenceError("Pictorial preview has been disposed");
  }

  public setRotation([x, y, z]: Vec3): void {
    this.#assertActive();
    this.object.rotation.set(degreesToRadians(x), degreesToRadians(y), degreesToRadians(z));
    this.object.updateMatrixWorld(true);
  }

  public setGhosted(ghosted: boolean): void {
    this.#assertActive();
    const previous = this.surface.material;
    this.surface.material = createExamSurfaceMaterial({ ghosted });
    if (!Array.isArray(previous)) previous.dispose();
    this.hiddenEdges.visible = ghosted && this.#edgesVisible;
  }

  public setEdgesVisible(visible: boolean): void {
    this.#assertActive();
    this.#edgesVisible = visible;
    this.edges.visible = visible;
    const surfaceMaterial = this.surface.material;
    const ghosted = !Array.isArray(surfaceMaterial) && surfaceMaterial.transparent;
    this.hiddenEdges.visible = visible && ghosted;
  }

  public highlightTriangles(
    triangleIndices: readonly number[],
    color?: ColorRepresentation,
  ): void {
    this.#assertActive();
    this.clearHighlight();
    const selectedPositions: number[] = [];
    for (const triangleIndex of triangleIndices) {
      if (!Number.isInteger(triangleIndex) || triangleIndex < 0 || triangleIndex >= this.#canonicalMesh.triangleCount) {
        throw new RangeError(`Triangle index ${triangleIndex} is outside the mesh`);
      }
      for (let corner = 0; corner < 3; corner += 1) {
        const vertexIndex = this.#canonicalMesh.indices[triangleIndex * 3 + corner];
        if (vertexIndex === undefined) throw new RangeError("Mesh index buffer is incomplete");
        const offset = vertexIndex * 3;
        selectedPositions.push(
          this.#canonicalMesh.positions[offset] ?? 0,
          this.#canonicalMesh.positions[offset + 1] ?? 0,
          this.#canonicalMesh.positions[offset + 2] ?? 0,
        );
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(selectedPositions, 3));
    geometry.computeVertexNormals();
    this.#highlight = new Mesh(geometry, createHighlightMaterial(color));
    this.#highlight.name = "selection-highlight";
    this.object.add(this.#highlight);
  }

  public highlightFeature(featureId: string, color?: ColorRepresentation): void {
    const group = this.#canonicalMesh.groups?.find((candidate) => candidate.featureId === featureId);
    if (group === undefined) throw new RangeError(`Unknown mesh feature: ${featureId}`);
    const firstTriangle = Math.floor(group.start / 3);
    const triangleCount = Math.floor(group.count / 3);
    this.highlightTriangles(
      Array.from({ length: triangleCount }, (_, index) => firstTriangle + index),
      color,
    );
  }

  public clearHighlight(): void {
    if (this.#highlight === undefined) return;
    this.object.remove(this.#highlight);
    this.#highlight.geometry.dispose();
    const material = this.#highlight.material;
    if (!Array.isArray(material)) material.dispose();
    this.#highlight = undefined;
  }

  public addProjectionPlane(size = 120): Mesh {
    this.#assertActive();
    if (!Number.isFinite(size) || size <= 0) throw new RangeError("Projection plane size must be positive");
    const material = new MeshBasicMaterial({
      color: 0x6aa9ff,
      opacity: 0.16,
      side: DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    const plane = new Mesh(new PlaneGeometry(size, size), material);
    plane.name = "projection-plane";
    plane.position.z = -size / 2;
    this.object.add(plane);
    this.#projectionPlanes.push(plane);
    return plane;
  }

  public dispose(): void {
    if (this.#disposed) return;
    this.clearHighlight();
    this.#surfaceGeometry.dispose();
    this.#edgeGeometry.dispose();
    const surfaceMaterial = this.surface.material;
    if (!Array.isArray(surfaceMaterial)) surfaceMaterial.dispose();
    const depthMaterial = this.#depthOccluder.material;
    if (!Array.isArray(depthMaterial)) depthMaterial.dispose();
    const edgeMaterial = this.edges.material;
    if (edgeMaterial instanceof LineBasicMaterial) edgeMaterial.dispose();
    const hiddenMaterial = this.hiddenEdges.material;
    if (hiddenMaterial instanceof LineDashedMaterial) hiddenMaterial.dispose();
    for (const plane of this.#projectionPlanes) {
      plane.geometry.dispose();
      const material = plane.material;
      if (!Array.isArray(material)) material.dispose();
    }
    this.#projectionPlanes = [];
    this.#disposed = true;
  }

  public [Symbol.dispose](): void {
    this.dispose();
  }
}

export const createPictorialPreview = (
  mesh: CanonicalMesh,
  options: PictorialPreviewOptions = {},
): PictorialPreview => new ThreePictorialPreview(mesh, options);
