import {
  canonicalStringify,
  createRandomSource,
  type JsonValue,
} from "../packages/core/src/index.js";
import { createManifoldKernel } from "../packages/geometry/src/index.js";
import { manifoldMeshToBufferGeometry } from "../packages/renderer-three/src/index.js";
import { svgDocument, svgPolygon } from "../packages/svg/src/index.js";
import { describe, expect, it } from "vitest";

const createRecipe = (seed: string): JsonValue => {
  const random = createRandomSource(seed);
  return {
    id: `phase0-${seed}`,
    operations: [{ kind: "base", params: { size: [
      random.int(10, 30),
      random.int(10, 30),
      random.int(10, 30),
    ] } }],
    seed,
    templateId: "phase0-cuboid",
    version: 1,
  };
};

describe("Phase 0 vertical integration", () => {
  it("moves a Manifold cube through mesh, Three.js, projection, and SVG", async () => {
    const kernel = await createManifoldKernel();
    using cube = kernel.cube([20, 30, 40], true);
    const mesh = kernel.getMesh(cube);
    const geometry = manifoldMeshToBufferGeometry(mesh);
    expect(geometry.getIndex()?.count).toBe(36);

    using projection = kernel.projectXY(cube);
    const section = kernel.getSection(projection);
    const firstPolygon = section.polygons[0];
    expect(firstPolygon).toBeDefined();
    const svg = svgDocument({
      viewBox: [-10, -15, 20, 30],
      title: "Phase 0 cube projection",
      children: [svgPolygon(firstPolygon ?? [])],
    });
    expect(svg).toContain("<polygon");
    geometry.dispose();
  });

  it("serializes the same seed byte-identically", () => {
    expect(canonicalStringify(createRecipe("acceptance-001"))).toBe(
      canonicalStringify(createRecipe("acceptance-001")),
    );
  });
});
