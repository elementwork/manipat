import {
  Color,
  Vector3,
  WebGLRenderer,
  type ColorRepresentation,
  type OrthographicCamera,
  type Scene,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { RuntimeViewPreset } from "./runtime-payload.js";

export interface InteractiveRuntimeViewerOptions {
  readonly background?: ColorRepresentation;
  readonly pixelRatioCap?: number;
  readonly enableDamping?: boolean;
  readonly autoRotate?: boolean;
  readonly autoRotateSpeed?: number;
  readonly minZoom?: number;
  readonly maxZoom?: number;
}

export interface InteractiveRuntimeViewer extends Disposable {
  readonly scene: Scene;
  readonly camera: OrthographicCamera;
  readonly renderer: WebGLRenderer;
  readonly controls: OrbitControls;
  readonly canvas: HTMLCanvasElement;
  readonly disposed: boolean;
  render(): void;
  resize(): void;
  reset(): void;
  setViewPreset(preset: RuntimeViewPreset): void;
  setAutoRotate(enabled: boolean): void;
  dispose(): void;
}

const directionForPreset = (preset: RuntimeViewPreset): Vector3 => {
  switch (preset) {
    case "isometric": return new Vector3(-1, -1, 1).normalize();
    case "front": return new Vector3(0, 1, 0);
    case "top": return new Vector3(0, 0, 1);
    case "right-end": return new Vector3(1, 0, 0);
    default: return preset satisfies never;
  }
};

const upForPreset = (preset: RuntimeViewPreset): Vector3 =>
  preset === "top" ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);

class BrowserInteractiveRuntimeViewer implements InteractiveRuntimeViewer {
  public readonly scene: Scene;
  public readonly camera: OrthographicCamera;
  public readonly renderer: WebGLRenderer;
  public readonly controls: OrbitControls;
  public readonly canvas: HTMLCanvasElement;
  readonly #container: HTMLElement;
  readonly #initialPosition: Vector3;
  readonly #initialUp: Vector3;
  readonly #initialTarget: Vector3;
  readonly #initialZoom: number;
  readonly #viewHeight: number;
  readonly #distance: number;
  readonly #window: Window;
  #resizeObserver: ResizeObserver | undefined;
  #disposed = false;

  public constructor(
    container: HTMLElement,
    scene: Scene,
    camera: OrthographicCamera,
    options: InteractiveRuntimeViewerOptions,
  ) {
    const ownerWindow = container.ownerDocument.defaultView;
    if (ownerWindow === null) throw new Error("Interactive viewer requires a browser window");
    this.#window = ownerWindow;
    this.#container = container;
    this.scene = scene;
    this.camera = camera;
    if (options.background !== undefined) this.scene.background = new Color(options.background);

    this.renderer = new WebGLRenderer({ antialias: true, alpha: options.background === undefined });
    const pixelRatioCap = options.pixelRatioCap ?? 2;
    if (!Number.isFinite(pixelRatioCap) || pixelRatioCap <= 0) {
      this.renderer.dispose();
      throw new RangeError("pixelRatioCap must be positive");
    }
    this.renderer.setPixelRatio(Math.min(ownerWindow.devicePixelRatio || 1, pixelRatioCap));
    this.canvas = this.renderer.domElement;
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.touchAction = "none";
    container.append(this.canvas);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = options.enableDamping ?? true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;
    this.controls.autoRotate = options.autoRotate ?? false;
    this.controls.autoRotateSpeed = options.autoRotateSpeed ?? 1.5;
    this.controls.minZoom = options.minZoom ?? 0.25;
    this.controls.maxZoom = options.maxZoom ?? 8;

    this.#initialPosition = this.camera.position.clone();
    this.#initialUp = this.camera.up.clone();
    this.#initialTarget = this.controls.target.clone();
    this.#initialZoom = this.camera.zoom;
    this.#viewHeight = this.camera.top - this.camera.bottom;
    this.#distance = Math.max(1, this.camera.position.distanceTo(this.controls.target));

    if (typeof ResizeObserver === "function") {
      this.#resizeObserver = new ResizeObserver(() => this.resize());
      this.#resizeObserver.observe(container);
    } else {
      ownerWindow.addEventListener("resize", this.resize);
    }

    this.resize();
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }

  public get disposed(): boolean {
    return this.#disposed;
  }

  #assertActive(): void {
    if (this.#disposed) throw new ReferenceError("Interactive runtime viewer has been disposed");
  }

  public render = (): void => {
    this.#assertActive();
    this.renderer.render(this.scene, this.camera);
  };

  public resize = (): void => {
    if (this.#disposed) return;
    const width = Math.max(1, this.#container.clientWidth || this.#container.getBoundingClientRect().width);
    const height = Math.max(1, this.#container.clientHeight || this.#container.getBoundingClientRect().height);
    const aspect = width / height;
    const halfHeight = this.#viewHeight / 2;
    const halfWidth = halfHeight * aspect;
    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.render();
  };

  public reset(): void {
    this.#assertActive();
    this.camera.position.copy(this.#initialPosition);
    this.camera.up.copy(this.#initialUp);
    this.camera.zoom = this.#initialZoom;
    this.controls.target.copy(this.#initialTarget);
    this.camera.lookAt(this.controls.target);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    this.controls.update();
    this.render();
  }

  public setViewPreset(preset: RuntimeViewPreset): void {
    this.#assertActive();
    const target = this.controls.target.clone();
    this.camera.position.copy(directionForPreset(preset).multiplyScalar(this.#distance).add(target));
    this.camera.up.copy(upForPreset(preset));
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld(true);
    this.controls.update();
    this.render();
  }

  public setAutoRotate(enabled: boolean): void {
    this.#assertActive();
    this.controls.autoRotate = enabled;
  }

  public dispose(): void {
    if (this.#disposed) return;
    this.renderer.setAnimationLoop(null);
    this.controls.dispose();
    if (this.#resizeObserver !== undefined) this.#resizeObserver.disconnect();
    else this.#window.removeEventListener("resize", this.resize);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
    this.#disposed = true;
  }

  public [Symbol.dispose](): void {
    this.dispose();
  }
}

/**
 * Mount an existing Three.js scene/camera into a responsive browser WebGL host.
 * Scene contents remain owned by the caller; disposing this object tears down
 * only controls, renderer, observers, and the canvas.
 */
export const createInteractiveRuntimeViewer = (
  container: HTMLElement,
  scene: Scene,
  camera: OrthographicCamera,
  options: InteractiveRuntimeViewerOptions = {},
): InteractiveRuntimeViewer => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Interactive Three.js runtime requires a browser DOM/WebGL environment");
  }
  return new BrowserInteractiveRuntimeViewer(container, scene, camera, options);
};
