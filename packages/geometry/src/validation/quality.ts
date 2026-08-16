import type { Vec3 } from "@manipat/core";
import type {
  GeometryKernel,
  GeometryValidationResult,
  SolidHandle,
} from "../kernel/types.js";

export interface GeometryQualityConfig {
  readonly minVolume: number;
  readonly minDimension: number;
  readonly maxDimensionRatio: number;
  readonly maxTriangles: number;
  readonly minFeatureToObjectRatio: number;
}

export const DEFAULT_GEOMETRY_QUALITY: GeometryQualityConfig = Object.freeze({
  minVolume: 1,
  minDimension: 1,
  maxDimensionRatio: 8,
  maxTriangles: 5_000,
  minFeatureToObjectRatio: 0.02,
});

export interface GeometryQualityResult {
  readonly passed: boolean;
  readonly kernel: GeometryValidationResult;
  readonly dimensions: Vec3 | null;
  readonly dimensionRatio: number | null;
  readonly errors: readonly string[];
}

export const validateGeometryQuality = (
  kernel: GeometryKernel,
  solid: SolidHandle,
  config: GeometryQualityConfig = DEFAULT_GEOMETRY_QUALITY,
): GeometryQualityResult => {
  const validation = kernel.validate(solid);
  const errors = [...validation.errors];
  if (validation.volume < config.minVolume) errors.push("Volume is below minimum");
  if (validation.triangleCount > config.maxTriangles) errors.push("Triangle count exceeds maximum");

  let dimensions: Vec3 | null = null;
  let dimensionRatio: number | null = null;
  if (validation.bounds !== null) {
    const { min, max } = validation.bounds;
    dimensions = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    const minimum = Math.min(...dimensions);
    const maximum = Math.max(...dimensions);
    dimensionRatio = minimum <= 0 ? Number.POSITIVE_INFINITY : maximum / minimum;
    if (minimum < config.minDimension) errors.push("A dimension is below minimum");
    if (dimensionRatio > config.maxDimensionRatio) errors.push("Dimension ratio exceeds maximum");
  }

  return {
    passed: errors.length === 0,
    kernel: validation,
    dimensions,
    dimensionRatio,
    errors,
  };
};
