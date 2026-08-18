import type { Vec3 } from "@manipat/core";
import {
  AmbientLight,
  DirectionalLight,
  Group,
  Scene,
  Vector3,
} from "three";
import { createIsometricOrthographicCamera } from "./cameras.js";
import {
  createInteractiveRuntimeViewer,
  type InteractiveRuntimeViewer,
  type InteractiveRuntimeViewerOptions,
} from "./runtime-viewer.js";
import {
  deserializeCanonicalMesh,
  type RuntimeMeshVisualization,
  type RuntimeVisualizationPayload,
  type RuntimeViewPreset,
  type RuntimeVoxelVisualization,
} from "./runtime-payload.js";
import { createPictorialPreview, type PictorialPreview } from "./scene.js";
import { createVoxelInstancedRender, type VoxelInstancedRender } from "./voxels.js";

export interface QuestionViewerCapabilities {
  readonly ghost: boolean;
  readonly edges: boolean;
  readonly explanation: boolean;
  readonly targetView: boolean;
}

export interface QuestionRuntimeViewer extends Disposable {
  readonly payload: RuntimeVisualizationPayload;
  readonly runtime: InteractiveRuntimeViewer;
  readonly capabilities: QuestionViewerCapabilities;
  readonly disposed: boolean;
  reset(): void;
  setViewPreset(preset: RuntimeViewPreset): void;
  setTargetView(): void;
  setAutoRotate(enabled: boolean): void;
  setGhosted(ghosted: boolean): void;
  setSurfaceVisible(visible: boolean): void;
  setEdgesVisible(visible: boolean): void;
  setExplanationVisible(visible: boolean): void;
  dispose(): void;
}

const ZERO_ROTATION: Vec3 = [0, 0, 0];

const highlightTrianglesForFeatures = (
  payload: RuntimeMeshVisualization,
): readonly number[] => {
  if (payload.highlightFeatureIds === undefined || payload.mesh.groups === undefined) return [];
  const requested = new Set(payload.highlightFeatureIds);
  return payload.mesh.groups.flatMap((group) => {
    if (!requested.has(group.featureId)) return [];
    const firstTriangle = Math.floor(group.start / 3);
    const triangleCount = Math.floor(group.count / 3);
    return Array.from({ length: triangleCount }, (_, index) => firstTriangle + index);
  });
};

class MeshQuestionRuntimeViewer implements QuestionRuntimeViewer {
  public readonly payload: RuntimeMeshVisualization;
  public readonly runtime: InteractiveRuntimeViewer;
  public readonly capabilities: QuestionViewerCapabilities;
  readonly #preview: PictorialPreview;
  readonly #highlightTriangles: readonly number[];
  #disposed = false;

  public constructor(
    container: HTMLElement,
    payload: RuntimeMeshVisualization,
    options: InteractiveRuntimeViewerOptions,
  ) {
    this.payload = payload;
    this.#preview = createPictorialPreview(deserializeCanonicalMesh(payload.mesh), {
      paddingFactor: 1.35,
    });
    this.#highlightTriangles = highlightTrianglesForFeatures(payload);
    this.runtime = createInteractiveRuntimeViewer(container, this.#preview.scene, this.#preview.camera, options);
    this.capabilities = Object.freeze({
      ghost: true,
      edges: true,
      explanation: this.#highlightTriangles.length > 0,
      targetView: payload.targetPreset !== undefined || payload.targetRotationDegrees !== undefined,
    });
  }

  public get disposed(): boolean {
    return this.#disposed;
  }

  #assertActive(): void {
    if (this.#disposed) throw new ReferenceError("Question runtime viewer has been disposed");
  }

  public reset(): void {
    this.#assertActive();
    this.#preview.setRotation(ZERO_ROTATION);
    this.#preview.clearHighlight();
    this.runtime.reset();
  }

  public setViewPreset(preset: RuntimeViewPreset): void {
    this.#assertActive();
    this.#preview.setRotation(ZERO_ROTATION);
    this.runtime.setViewPreset(preset);
  }

  public setTargetView(): void {
    this.#assertActive();
    if (this.payload.targetRotationDegrees !== undefined) {
      this.#preview.setRotation(this.payload.targetRotationDegrees);
    }
    this.runtime.setViewPreset(this.payload.targetPreset ?? "top");
  }

  public setAutoRotate(enabled: boolean): void {
    this.#assertActive();
    this.runtime.setAutoRotate(enabled);
  }

  public setGhosted(ghosted: boolean): void {
    this.#assertActive();
    this.#preview.setGhosted(ghosted);
    this.runtime.render();
  }

  public setSurfaceVisible(visible: boolean): void {
    this.#assertActive();
    this.#preview.surface.visible = visible;
    this.runtime.render();
  }

  public setEdgesVisible(visible: boolean): void {
    this.#assertActive();
    this.#preview.setEdgesVisible(visible);
    this.runtime.render();
  }

  public setExplanationVisible(visible: boolean): void {
    this.#assertActive();
    if (this.#highlightTriangles.length === 0) return;
    if (visible) this.#preview.highlightTriangles(this.#highlightTriangles);
    else this.#preview.clearHighlight();
    this.runtime.render();
  }

  public dispose(): void {
    if (this.#disposed) return;
    this.runtime.dispose();
    this.#preview.dispose();
    this.#disposed = true;
  }

  public [Symbol.dispose](): void {
    this.dispose();
  }
}

const voxelBounds = (positions: readonly Vec3[]): {
  readonly center: Vector3;
  readonly radius: number;
} => {
  if (positions.length === 0) throw new RangeError("Voxel visualization requires at least one cube");
  const xs = positions.map(([x]) => x);
  const ys = positions.map(([, y]) => y);
  const zs = positions.map(([, , z]) => z);
  const min = new Vector3(Math.min(...xs) - 0.5, Math.min(...ys) - 0.5, Math.min(...zs) - 0.5);
  const max = new Vector3(Math.max(...xs) + 0.5, Math.max(...ys) + 0.5, Math.max(...zs) + 0.5);
  const center = min.clone().add(max).multiplyScalar(0.5);
  const radius = Math.max(1, max.clone().sub(min).length() / 2);
  return { center, radius };
};

class VoxelQuestionRuntimeViewer implements QuestionRuntimeViewer {
  public readonly payload: RuntimeVoxelVisualization;
  public readonly runtime: InteractiveRuntimeViewer;
  public readonly capabilities: QuestionViewerCapabilities;
  readonly #voxels: VoxelInstancedRender;
  readonly #group: Group;
  #disposed = false;

  public constructor(
    container: HTMLElement,
    payload: RuntimeVoxelVisualization,
    options: InteractiveRuntimeViewerOptions,
  ) {
    this.payload = payload;
    const { center, radius } = voxelBounds(payload.positions);
    const scene = new Scene();
    this.#group = new Group();
    this.#group.position.copy(center.multiplyScalar(-1));
    this.#voxels = createVoxelInstancedRender(payload.positions);
    this.#group.add(this.#voxels.mesh);
    scene.add(this.#group);
    scene.add(new AmbientLight(0xffffff, 1.6));
    const key = new DirectionalLight(0xffffff, 2.2);
    key.position.set(1, -2, 3);
    scene.add(key);

    const distance = Math.max(radius * 4, 12);
    const camera = createIsometricOrthographicCamera({
      viewSize: radius * 2.7,
      distance,
      near: Math.max(0.1, distance - radius * 2.2),
      far: distance + radius * 2.2,
    });
    this.runtime = createInteractiveRuntimeViewer(container, scene, camera, options);
    this.capabilities = Object.freeze({
      ghost: false,
      edges: false,
      explanation: (payload.highlightIndices?.length ?? 0) > 0,
      targetView: payload.targetPreset !== undefined,
    });
  }

  public get disposed(): boolean {
    return this.#disposed;
  }

  #assertActive(): void {
    if (this.#disposed) throw new ReferenceError("Question runtime viewer has been disposed");
  }

  public reset(): void {
    this.#assertActive();
    this.#voxels.clearHighlight();
    this.runtime.reset();
  }

  public setViewPreset(preset: RuntimeViewPreset): void {
    this.#assertActive();
    this.runtime.setViewPreset(preset);
  }

  public setTargetView(): void {
    this.#assertActive();
    if (this.payload.targetPreset !== undefined) this.runtime.setViewPreset(this.payload.targetPreset);
  }

  public setAutoRotate(enabled: boolean): void {
    this.#assertActive();
    this.runtime.setAutoRotate(enabled);
  }

  public setGhosted(ghosted: boolean): void {
    this.#assertActive();
    void ghosted;
  }

  public setSurfaceVisible(visible: boolean): void {
    this.#assertActive();
    this.#voxels.mesh.visible = visible;
    this.runtime.render();
  }

  public setEdgesVisible(visible: boolean): void {
    this.#assertActive();
    void visible;
  }

  public setExplanationVisible(visible: boolean): void {
    this.#assertActive();
    const indices = this.payload.highlightIndices ?? [];
    if (indices.length === 0) return;
    if (visible) this.#voxels.setHighlighted(indices);
    else this.#voxels.clearHighlight();
    this.runtime.render();
  }

  public dispose(): void {
    if (this.#disposed) return;
    this.runtime.dispose();
    this.#voxels.dispose();
    this.#disposed = true;
  }

  public [Symbol.dispose](): void {
    this.dispose();
  }
}

/** Mount a serializable ManipAT 3D question payload as an interactive viewer. */
export const createQuestionRuntimeViewer = (
  container: HTMLElement,
  payload: RuntimeVisualizationPayload,
  options: InteractiveRuntimeViewerOptions = {},
): QuestionRuntimeViewer => payload.kind === "mesh"
  ? new MeshQuestionRuntimeViewer(container, payload, options)
  : new VoxelQuestionRuntimeViewer(container, payload, options);
