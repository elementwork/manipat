import type { CanonicalMesh } from "@manipat/geometry";
import { describe, expect, it } from "vitest";
import {
  createFrontCamera,
  createIsometricOrthographicCamera,
  manifoldMeshToBufferGeometry,
} from "../src/index.js";

const triangle: CanonicalMesh = {
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  indices: new Uint32Array([0, 1, 2]),
  vertexCount: 3,
  triangleCount: 1,
  bounds: { min: [0, 0, 0], max: [1, 1, 0] },
};

describe("Three.js renderer foundations", () => {
  it("converts canonical mesh buffers and computes bounds", () => {
    const geometry = manifoldMeshToBufferGeometry(triangle);
    expect(geometry.getAttribute("position").count).toBe(3);
    expect(geometry.getIndex()?.count).toBe(3);
    expect(geometry.boundingBox?.max.toArray()).toEqual([1, 1, 0]);
    geometry.dispose();
  });

  it("creates canonical orthographic cameras", () => {
    const front = createFrontCamera({ distance: 100 });
    expect(front.position.toArray()).toEqual([0, 100, 0]);

    const isometric = createIsometricOrthographicCamera({ distance: 90 });
    expect(isometric.position.length()).toBeCloseTo(90);
    expect(isometric.position.x).toBeLessThan(0);
    expect(isometric.position.y).toBeLessThan(0);
    expect(isometric.position.z).toBeGreaterThan(0);
    expect(isometric.isOrthographicCamera).toBe(true);
  });
});
