/** Centralized, dimensionless model-space tolerances. */
export const EPS = Object.freeze({
  point: 1e-7,
  length: 1e-6,
  angleRad: 1e-6,
  coplanar: 1e-6,
  collinear: 1e-6,
  area: 1e-8,
  projection: 1e-5,
});

export const CANONICAL_LONGEST_DIMENSION = 100;
