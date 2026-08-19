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
  MeshStandardMaterial,
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
  readonly semanticSurface: Mesh;
  readonly edges: LineSegments;
  readonly hiddenEdges: LineSegments;
  readonly disposed: boolean;
  setRotation(degreesXYZ: Vec3): void;
  setGhosted(ghosted: boolean): void;
  setColorCoded(enabled: boolean): void;
  setSurfaceVisible(visible: boolean): void;
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

const semanticKindFromFeatureId = (featureId: string): SemanticSurfaceKind | undefined => {
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
}

const triangleInfo = (mesh: CanonicalMesh): readonly TriangleInfo[] => {
  const result: TriangleInfo[] = [];
  for (let triangleIndex = 0; triangleIndex < mesh.triangleCount; triangleIndex += 1) {
    const aIndex = mesh.indices[triangleIndex * 3];
    const bIndex = mesh.indices[triangleIndex * 3 + 1];
    const cIndex = mesh.indices[triangleIndex * 3 + 2];
    if (aIndex === undefined || bIndex === undefined || cIndex === undefined) {
      throw new RangeError("Mesh index buffer is incomplete");
    }
    const point = (index: number): Vector3 => new Vector3(
      mesh.positions[index * 3] ?? 0,
      mesh.positions[index * 3 + 1] ?? 0,
      mesh.positions[index * 3 + 2] ?? 0,
    );
    const a = point(aIndex);
    const b = point(bIndex);
    const c = point(cIndex);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    result.push({ indices: [aIndex, bIndex, cIndex], normal, centroid });
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
  const adjacent = triangles.map(() => new Set<number>());
  for (const entries of byEdge.values()) {
    for (const first of entries) {
      for (const second of entries) {
        if (first !== second) adjacent[first]?.add(second);
      }
    }
  }
  return adjacent;
};

const isExteriorPlane = (
  mesh: CanonicalMesh,
  triangle: TriangleInfo,
  tolerance: number,
): boolean => {
  const components = [
    Math.abs(triangle.normal.x),
    Math.abs(triangle.normal.y),
    Math.abs(triangle.normal.z),
  ];
  const dominant = components.indexOf(Math.max(...components));
  if ((components[dominant] ?? 0) < 0.94) return false;
  const coordinate = triangle.centroid.getComponent(dominant);
  const minimum = mesh.bounds.min[dominant] ?? 0;
  const maximum = mesh.bounds.max[dominant] ?? 0;
  return Math.abs(coordinate - minimum) <= tolerance || Math.abs(coordinate - maximum) <= tolerance;
};

const classifySemanticTriangles = (mesh: CanonicalMesh): readonly SemanticSurfaceKind[] => {
  const triangles = triangleInfo(mesh);
  const adjacency = triangleAdjacency(triangles);
  const center = new Vector3(
    (mesh.bounds.min[0] + mesh.bounds.max[0]) / 2,
    (mesh.bounds.min[1] + mesh.bounds.max[1]) / 2,
    (mesh.bounds.min[2] + mesh.bounds.max[2]) / 2,
  );
  const radius = Math.max(framingRadius(mesh), 1e-6);
  const radialTolerance = Math.max(radius * 0.018, 1e-6);
  const planeTolerance = Math.max(radius * 0.015, 1e-6);
  const kinds: SemanticSurfaceKind[] = triangles.map(() => "body");
  const hinted = new Set<number>();

  for (const group of mesh.groups ?? []) {
    const kind = semanticKindFromFeatureId(group.featureId);
    if (kind === undefined) continue;
    const firstTriangle = Math.floor(group.start / 3);
    const triangleCount = Math.floor(group.count / 3);
    for (let offset = 0; offset < triangleCount; offset += 1) {
      const index = firstTriangle + offset;
      if (index >= 0 && index < kinds.length) {
        kinds[index] = kind;
        hinted.add(index);
      }
    }
  }

  // Geometry fallback for normalized CSG meshes whose source feature IDs are
  // not retained. Inward-facing triangles relative to the solid envelope are
  // strong cavity/recess cues. This affects only an optional learning overlay;
  // answer truth never depends on this classification.
  triangles.forEach((triangle, index) => {
    if (hinted.has(index)) return;
    const radial = triangle.centroid.clone().sub(center).dot(triangle.normal);
    if (radial < -radialTolerance) kinds[index] = "recess";
  });

  // A blind-hole/recess floor is typically adjacent to a cavity wall, changes
  // normal sharply, and is not itself one of the object's global exterior
  // planes. Mark it amber as a terminating interior surface.
  triangles.forEach((triangle, index) => {
    if (hinted.has(index) || kinds[index] !== "body") return;
    if (isExteriorPlane(mesh, triangle, planeTolerance)) return;
    const touchesRecess = [...(adjacency[index] ?? [])].some((neighbor) => {
      if (kinds[neighbor] !== "recess") return false;
      const other = triangles[neighbor];
      return other !== undefined && Math.abs(triangle.normal.dot(other.normal)) < 0.55;
    });
    if (touchesRecess) kinds[index] = "terminal";
  });

  // Smooth outward surfaces away from the global envelope are useful cues for
  // bosses/bumps. Require normal variation across neighbors so ordinary planar
  // sloped faces stay neutral.
  triangles.forEach((triangle, index) => {
    if (hinted.has(index) || kinds[index] !== "body") return;
    if (isExteriorPlane(mesh, triangle, planeTolerance)) return;
    const radial = triangle.centroid.clone().sub(center).dot(triangle.normal);
    if (radial <= radialTolerance) return;
    const hasCurvedNeighbor = [...(adjacency[index] ?? [])].some((neighbor) => {
      const other = triangles[neighbor];
      if (other === undefined || kinds[neighbor] === "recess") return false;
      const alignment = triangle.normal.dot(other.normal);
      return alignment > 0.45 && alignment < 0.985;
    });
    if (hasCurvedNeighbor) kinds[index] = "protrusion";
  });

  return kinds;
};

const createSemanticSurfaceGeometry = (mesh: CanonicalMesh): BufferGeometry => {
  const positions: number[] = [];
  const colors: number[] = [];
  const kinds = classifySemanticTriangles(mesh);
  for (let triangleIndex = 0; triangleIndex < mesh.triangleCount; triangleIndex += 1) {
    const color = new Color(SEMANTIC_COLORS[kinds[triangleIndex] ?? "body"]);
    for (let corner = 0; corner < 3; corner += 1) {
      const vertexIndex = mesh.indices[triangleIndex * 3 + corner];
      if (vertexIndex === undefined) throw new RangeError("Mesh index buffer is incomplete");
      const offset = vertexIndex * 3;
      positions.push(
        mesh.positions[offset] ?? 0,
        mesh.positions[offset + 1] ?? 0,
        mesh.positions[offset + 2] ?? 0,
      );
      colors.push(color.r, color.g, color.b);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
};

const createSemanticSurfaceMaterial = (ghosted: boolean): MeshStandardMaterial =>
  new MeshStandardMaterial({
    vertexColors: true,
    metalness: 0,
    roughness: 0.72,
    transparent: ghosted,
    opacity: ghosted ? 0.24 : 0.94,
    depthWrite: !ghosted,
  });

class ThreePictorialPreview implements PictorialPreview {
  public readonly scene: Scene;
  public readonly camera: OrthographicCamera;
  public readonly object: Group;
  public readonly surface: Mesh;
  public readonly semanticSurface: Mesh;
  public readonly edges: LineSegments;
  public readonly hiddenEdges: LineSegments;
  readonly #depthOccluder: Mesh;
  readonly #canonicalMesh: CanonicalMesh;
  readonly #surfaceGeometry: BufferGeometry;
  readonly #semanticGeometry: BufferGeometry;
  readonly #edgeGeometry: EdgesGeometry;
  #highlight: Mesh | undefined;
  #projectionPlanes: Mesh[] = [];
  #edgesVisible = true;
  #surfaceVisible = true;
  #colorCoded = false;
  #ghosted = false;
  #disposed = false;

  public constructor(mesh: CanonicalMesh, options: PictorialPreviewOptions) {
    this.#canonicalMesh = mesh;
    this.#ghosted = options.ghosted === true;
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
    this.#semanticGeometry = createSemanticSurfaceGeometry(mesh);

    // The invisible depth pre-pass lets Ghost mode distinguish visible edges
    // from edges occluded by the nearest surface.
    this.#depthOccluder = new Mesh(this.#surfaceGeometry, createDepthOccluderMaterial());
    this.#depthOccluder.name = "depth-occluder";
    this.#depthOccluder.renderOrder = -2;

    this.surface = new Mesh(this.#surfaceGeometry, createExamSurfaceMaterial(options));
    this.surface.renderOrder = -1;

    this.semanticSurface = new Mesh(this.#semanticGeometry, createSemanticSurfaceMaterial(this.#ghosted));
    this.semanticSurface.name = "semantic-surface";
    this.semanticSurface.visible = false;
    this.semanticSurface.renderOrder = -1;

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
    this.hiddenEdges.visible = this.#ghosted;
    this.hiddenEdges.renderOrder = 1;

    this.edges = new LineSegments(this.#edgeGeometry, createExamEdgeMaterial());
    this.edges.name = "visible-edges";
    this.edges.renderOrder = 2;

    this.object.add(
      this.#depthOccluder,
      this.surface,
      this.semanticSurface,
      this.hiddenEdges,
      this.edges,
    );
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

  #syncSurfaceVisibility(): void {
    this.surface.visible = this.#surfaceVisible && !this.#colorCoded;
    this.semanticSurface.visible = this.#surfaceVisible && this.#colorCoded;
  }

  public setRotation([x, y, z]: Vec3): void {
    this.#assertActive();
    this.object.rotation.set(degreesToRadians(x), degreesToRadians(y), degreesToRadians(z));
    this.object.updateMatrixWorld(true);
  }

  public setGhosted(ghosted: boolean): void {
    this.#assertActive();
    this.#ghosted = ghosted;
    const previous = this.surface.material;
    this.surface.material = createExamSurfaceMaterial({ ghosted });
    if (!Array.isArray(previous)) previous.dispose();
    const previousSemantic = this.semanticSurface.material;
    this.semanticSurface.material = createSemanticSurfaceMaterial(ghosted);
    if (!Array.isArray(previousSemantic)) previousSemantic.dispose();
    this.hiddenEdges.visible = ghosted && this.#edgesVisible;
  }

  public setColorCoded(enabled: boolean): void {
    this.#assertActive();
    this.#colorCoded = enabled;
    this.#syncSurfaceVisibility();
  }

  public setSurfaceVisible(visible: boolean): void {
    this.#assertActive();
    this.#surfaceVisible = visible;
    this.#syncSurfaceVisibility();
  }

  public setEdgesVisible(visible: boolean): void {
    this.#assertActive();
    this.#edgesVisible = visible;
    this.edges.visible = visible;
    this.hiddenEdges.visible = visible && this.#ghosted;
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
    this.#semanticGeometry.dispose();
    this.#edgeGeometry.dispose();
    const surfaceMaterial = this.surface.material;
    if (!Array.isArray(surfaceMaterial)) surfaceMaterial.dispose();
    const semanticMaterial = this.semanticSurface.material;
    if (!Array.isArray(semanticMaterial)) semanticMaterial.dispose();
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
