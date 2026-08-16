import { EPS } from "../tolerances.js";
import type { Vec2, Vec3 } from "../types.js";

export const add3 = (a: Vec3, b: Vec3): Vec3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];

export const subtract3 = (a: Vec3, b: Vec3): Vec3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];

export const scale3 = (vector: Vec3, scalar: number): Vec3 => [
  vector[0] * scalar,
  vector[1] * scalar,
  vector[2] * scalar,
];

export const dot3 = (a: Vec3, b: Vec3): number =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const cross3 = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export const length3 = (vector: Vec3): number => Math.hypot(...vector);

export const normalize3 = (vector: Vec3): Vec3 => {
  const length = length3(vector);
  if (length <= EPS.length) {
    throw new RangeError("Cannot normalize a zero-length vector");
  }
  return scale3(vector, 1 / length);
};

export const distance2 = (a: Vec2, b: Vec2): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);
