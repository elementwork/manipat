import { describe, expect, it } from "vitest";
import {
  canonicalizeSilhouette,
  silhouetteFingerprint,
  signedPolygonArea,
} from "../src/index.js";

describe("canonical silhouettes", () => {
  it("normalizes winding and starting vertex", () => {
    const first = canonicalizeSilhouette({
      polygons: [[[2, 0], [0, 0], [0, 1], [2, 1]]],
      bounds: { min: [0, 0], max: [2, 1] },
    });
    const second = canonicalizeSilhouette({
      polygons: [[[0, 1], [0, 0], [2, 0], [2, 1]]],
      bounds: { min: [0, 0], max: [2, 1] },
    });
    expect(signedPolygonArea(first.polygons[0] ?? [])).toBeGreaterThan(0);
    expect(silhouetteFingerprint(first)).toBe(silhouetteFingerprint(second));
  });

  it("drops interior contours from physical-fit silhouettes", () => {
    const result = canonicalizeSilhouette({
      polygons: [
        [[0, 0], [10, 0], [10, 10], [0, 10]],
        [[2, 2], [2, 3], [3, 3], [3, 2]],
      ],
      bounds: { min: [0, 0], max: [10, 10] },
    });
    expect(result.polygons).toHaveLength(1);
  });
});
