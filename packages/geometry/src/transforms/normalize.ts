import { CANONICAL_LONGEST_DIMENSION, type Vec3 } from "@manipat/core";
import type { GeometryKernel, SolidHandle } from "../kernel/types.js";

export interface NormalizationTransform {
  readonly translation: Vec3;
  readonly uniformScale: number;
}

export interface NormalizedSolid {
  readonly solid: SolidHandle;
  readonly transform: NormalizationTransform;
}

/** Centers and uniformly scales a non-empty solid into the canonical envelope. */
export const normalizeSolid = (
  kernel: GeometryKernel,
  solid: SolidHandle,
  targetLongestDimension = CANONICAL_LONGEST_DIMENSION,
): NormalizedSolid => {
  if (!Number.isFinite(targetLongestDimension) || targetLongestDimension <= 0) {
    throw new RangeError("Target longest dimension must be positive and finite");
  }
  const validation = kernel.validate(solid);
  if (!validation.valid || validation.bounds === null) {
    throw new TypeError(`Cannot normalize invalid geometry: ${validation.errors.join(", ")}`);
  }
  const { min, max } = validation.bounds;
  const dimensions: Vec3 = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const longest = Math.max(...dimensions);
  const translation: Vec3 = [
    -(min[0] + max[0]) / 2,
    -(min[1] + max[1]) / 2,
    -(min[2] + max[2]) / 2,
  ];
  const uniformScale = targetLongestDimension / longest;
  using centered = kernel.translate(solid, translation);
  return {
    solid: kernel.scale(centered, [uniformScale, uniformScale, uniformScale]),
    transform: { translation, uniformScale },
  };
};
