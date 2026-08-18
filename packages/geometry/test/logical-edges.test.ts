import { describe, expect, it } from "vitest";
import {
  FRONT_FRAME,
  createManifoldKernel,
  createOrthographicView,
  extractLogicalTopology,
  mergeCollinearSegments,
} from "../src/index.js";

describe("logical topology and TFE projection", () => {
  it("suppresses cube triangulation diagonals", async () => {
    const kernel = await createManifoldKernel();
    using cube = kernel.cube([10, 10, 10], true);
    const mesh = kernel.getMesh(cube);
    const topology = extractLogicalTopology(mesh);
    expect(topology.faces).toHaveLength(6);
    expect(topology.edges).toHaveLength(12);
  });

  it("projects a cube to four visible lines with solid-over-hidden priority", async () => {
    const kernel = await createManifoldKernel();
    using cube = kernel.cube([10, 20, 30], true);
    const view = createOrthographicView(kernel.getMesh(cube), FRONT_FRAME);
    expect(view.visible).toHaveLength(4);
    expect(view.hidden).toHaveLength(0);
    expect(view.bounds).toEqual({ min: [-5, -15], max: [5, 15] });
  });

  it("suppresses 12-sided cylinder facet clutter while keeping the true silhouette", async () => {
    const kernel = await createManifoldKernel();
    using cylinder = kernel.cylinder(20, 5, 5, 12, true);
    const view = createOrthographicView(kernel.getMesh(cylinder), FRONT_FRAME, {
      subdivisions: 6,
      visibilityRule: "midpoint",
    });
    expect(view.visible.length).toBeGreaterThanOrEqual(4);
    expect(view.visible.length).toBeLessThanOrEqual(6);
    expect(view.hidden).toHaveLength(0);
  });

  it("merges large connected fragment chains without pairwise rescanning", () => {
    const fragments = Array.from({ length: 1_200 }, (_, index) => ({
      a: [index, 0] as const,
      b: [index + 1, 0] as const,
    }));
    expect(mergeCollinearSegments(fragments)).toEqual([
      { a: [0, 0], b: [1_200, 0] },
    ]);
  });

  it("keeps disjoint collinear runs and perpendicular junctions separate", () => {
    expect(mergeCollinearSegments([
      { a: [0, 0], b: [1, 0] },
      { a: [1, 0], b: [2, 0] },
      { a: [1, 0], b: [1, 1] },
      { a: [3, 0], b: [4, 0] },
    ])).toEqual([
      { a: [0, 0], b: [2, 0] },
      { a: [1, 0], b: [1, 1] },
      { a: [3, 0], b: [4, 0] },
    ]);
  });
});
