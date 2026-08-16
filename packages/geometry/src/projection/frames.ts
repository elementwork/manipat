import type { Vec3 } from "@manipat/core";

export interface ProjectionFrame {
  readonly viewDirection: Vec3;
  readonly imageRight: Vec3;
  readonly imageUp: Vec3;
}

export const FRONT_FRAME = Object.freeze({
  viewDirection: [0, -1, 0],
  imageRight: [1, 0, 0],
  imageUp: [0, 0, 1],
} as const satisfies ProjectionFrame);

export const TOP_FRAME = Object.freeze({
  viewDirection: [0, 0, -1],
  imageRight: [1, 0, 0],
  imageUp: [0, 1, 0],
} as const satisfies ProjectionFrame);

/** Right-side end view: camera at +X looking toward the origin. */
export const RIGHT_END_FRAME = Object.freeze({
  viewDirection: [-1, 0, 0],
  imageRight: [0, 1, 0],
  imageUp: [0, 0, 1],
} as const satisfies ProjectionFrame);
