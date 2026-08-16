import {
  EPS,
  canonicalStringify,
  fingerprint64,
  type JsonValue,
  type Vec2,
} from "@manipat/core";
import type { CanonicalSection2D } from "../kernel/types.js";

export const signedPolygonArea = (polygon: readonly Vec2[]): number =>
  polygon.reduce((sum, point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    return next === undefined ? sum : sum + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;

const snap = (value: number, tolerance: number): number => {
  const snapped = Number((Math.round(value / tolerance) * tolerance).toPrecision(15));
  return Object.is(snapped, -0) ? 0 : snapped;
};

const comparePoint = (a: Vec2, b: Vec2): number => a[0] - b[0] || a[1] - b[1];

const rotateToSmallest = (polygon: readonly Vec2[]): readonly Vec2[] => {
  let smallest = 0;
  for (let index = 1; index < polygon.length; index += 1) {
    const point = polygon[index];
    const current = polygon[smallest];
    if (point !== undefined && current !== undefined && comparePoint(point, current) < 0) {
      smallest = index;
    }
  }
  return [...polygon.slice(smallest), ...polygon.slice(0, smallest)];
};

const cleanPolygon = (
  polygon: readonly Vec2[],
  tolerance: number,
): readonly Vec2[] => {
  const snapped = polygon.map(([x, y]): Vec2 => [snap(x, tolerance), snap(y, tolerance)]);
  const unique = snapped.filter((point, index) => {
    const previous = snapped[(index - 1 + snapped.length) % snapped.length];
    return previous === undefined
      || Math.hypot(point[0] - previous[0], point[1] - previous[1]) > tolerance;
  });
  if (unique.length < 3) return [];
  const oriented = signedPolygonArea(unique) < 0 ? [...unique].reverse() : unique;
  return rotateToSmallest(oriented);
};

const boundsFor = (polygon: readonly Vec2[]): CanonicalSection2D["bounds"] => ({
  min: [Math.min(...polygon.map(([x]) => x)), Math.min(...polygon.map(([, y]) => y))],
  max: [Math.max(...polygon.map(([x]) => x)), Math.max(...polygon.map(([, y]) => y))],
});

/** Canonicalizes the largest outer projection contour; interior voids do not affect fit. */
export const canonicalizeSilhouette = (
  section: CanonicalSection2D,
  tolerance = EPS.projection,
): CanonicalSection2D => {
  const cleaned = section.polygons
    .map((polygon) => cleanPolygon(polygon, tolerance))
    .filter((polygon) => polygon.length >= 3)
    .sort((a, b) => Math.abs(signedPolygonArea(b)) - Math.abs(signedPolygonArea(a)));
  const outer = cleaned[0];
  if (outer === undefined) {
    throw new TypeError("Projection does not contain a usable outer contour");
  }
  return { polygons: [outer], bounds: boundsFor(outer) };
};

export const silhouetteFingerprint = (section: CanonicalSection2D): string =>
  fingerprint64(canonicalStringify(section.polygons as JsonValue));

export const mapSilhouette = (
  section: CanonicalSection2D,
  transform: (point: Vec2) => Vec2,
): CanonicalSection2D => canonicalizeSilhouette({
  polygons: section.polygons.map((polygon) => polygon.map(transform)),
  bounds: section.bounds,
});
