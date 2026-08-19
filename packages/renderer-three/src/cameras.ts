import { OrthographicCamera, Vector3 } from "three";

export interface OrthographicCameraOptions {
  readonly viewSize?: number;
  readonly aspect?: number;
  readonly distance?: number;
  readonly near?: number;
  readonly far?: number;
}

const createCamera = (
  position: readonly [number, number, number],
  up: readonly [number, number, number],
  options: OrthographicCameraOptions = {},
): OrthographicCamera => {
  const {
    viewSize = 120,
    aspect = 1,
    distance = 200,
    near = 0.1,
    far = 1000,
  } = options;
  if (viewSize <= 0 || aspect <= 0 || distance <= 0 || near <= 0 || far <= near) {
    throw new RangeError("Camera dimensions and clipping planes must be positive");
  }
  const halfHeight = viewSize / 2;
  const halfWidth = halfHeight * aspect;
  const camera = new OrthographicCamera(
    -halfWidth,
    halfWidth,
    halfHeight,
    -halfHeight,
    near,
    far,
  );
  camera.position.copy(new Vector3(...position).normalize().multiplyScalar(distance));
  camera.up.set(...up);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
};

/** Canonical FRONT_FRAME: camera at +Y looking along -Y. */
export const createFrontCamera = (
  options?: OrthographicCameraOptions,
): OrthographicCamera => createCamera([0, 1, 0], [0, 0, 1], options);

/** Canonical TOP_FRAME: camera at +Z looking along -Z. */
export const createTopCamera = (
  options?: OrthographicCameraOptions,
): OrthographicCamera => createCamera([0, 0, 1], [0, 1, 0], options);

/** Canonical RIGHT_END_FRAME: camera at +X looking along -X. */
export const createRightEndCamera = (
  options?: OrthographicCameraOptions,
): OrthographicCamera => createCamera([1, 0, 0], [0, 0, 1], options);

/** Matches the fixed Aperture pictorial frame used by the SVG generator. */
export const createIsometricOrthographicCamera = (
  options?: OrthographicCameraOptions,
): OrthographicCamera => createCamera([-1, -1, 1], [0, 0, 1], options);
