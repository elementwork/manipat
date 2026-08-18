import type { CanonicalMesh } from "@manipat/geometry";
import { describe, expect, it } from "vitest";
import {
  deserializeCanonicalMesh,
  indexedFacesToCanonicalMesh,
  serializeCanonicalMesh,
} from "../src/index.js";

const mesh: CanonicalMesh = {
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  indices: new Uint32Array([0, 1, 2]),
  vertexCount: 3,
  triangleCount: 1,
  groups: [{ featureId: "face", start: 0, count: 3 }],
  bounds: { min: [0, 0, 0], max: [1, 1, 0] },
};

describe("runtime visualization payloads", () => {
  it("round-trips canonical meshes through JSON-safe arrays", () => {
    const serialized = serializeCanonicalMesh(mesh);
    expect(Array.isArray(serialized.positions)).toBe(true);
    expect(Array.isArray(serialized.indices)).toBe(true);
    const restored = deserializeCanonicalMesh(JSON.parse(JSON.stringify(serialized)));
    expect(Array.from(restored.positions)).toEqual(Array.from(mesh.positions));
    expect(Array.from(restored.indices)).toEqual(Array.from(mesh.indices));
    expect(restored.groups).toEqual(mesh.groups);
  });

  it("triangulates logical polyhedra and preserves face groups", () => {
    const tetrahedron = indexedFacesToCanonicalMesh(
      [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]],
      [
        { id: "base", vertexIds: [0, 2, 1] },
        { id: "x", vertexIds: [0, 1, 3] },
        { id: "y", vertexIds: [0, 3, 2] },
        { id: "slope", vertexIds: [1, 2, 3] },
      ],
    );
    expect(tetrahedron.vertexCount).toBe(4);
    expect(tetrahedron.triangleCount).toBe(4);
    expect(tetrahedron.groups?.map(({ featureId }) => featureId)).toEqual([
      "base", "x", "y", "slope",
    ]);
    expect(tetrahedron.groups?.every(({ count }) => count === 3)).toBe(true);
  });
});
