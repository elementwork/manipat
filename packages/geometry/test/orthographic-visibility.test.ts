import { describe, expect, it } from "vitest";
import { createManifoldKernel, createOrthographicView, normalizeSolid } from "../src/index.js";
import type { ProjectionFrame } from "../src/index.js";

const ISOMETRIC_FRAME: ProjectionFrame = {
  viewDirection: [1 / Math.sqrt(3), 1 / Math.sqrt(3), -1 / Math.sqrt(3)],
  imageRight: [1 / Math.sqrt(2), -1 / Math.sqrt(2), 0],
  imageUp: [1 / Math.sqrt(6), 1 / Math.sqrt(6), 2 / Math.sqrt(6)],
};

describe("orthographic visibility acceleration", () => {
  it("keeps deterministic midpoint-clipped line art on multi-feature geometry", async () => {
    const kernel = await createManifoldKernel();
    using base = kernel.cube([70, 42, 28], true);
    using upperBase = kernel.cube([32, 26, 25], true);
    using upper = kernel.translate(upperBase, [8, -4, 23]);
    using joined = kernel.union([base, upper]);
    using cutBase = kernel.cylinder(60, 8, 8, 20, true);
    using cut = kernel.rotate(cutBase, [90, 0, 0]);
    using solid = kernel.difference(joined, cut);
    const normalizedResult = normalizeSolid(kernel, solid);
    using normalized = normalizedResult.solid;
    const mesh = kernel.getMesh(normalized);

    const first = createOrthographicView(mesh, ISOMETRIC_FRAME, {
      subdivisions: 24,
      visibilityRule: "midpoint",
    });
    const second = createOrthographicView(mesh, ISOMETRIC_FRAME, {
      subdivisions: 24,
      visibilityRule: "midpoint",
    });

    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.visible.length).toBeGreaterThan(0);
    expect(first.hidden.length).toBeGreaterThan(0);
    expect(first.bounds.max[0]).toBeGreaterThan(first.bounds.min[0]);
    expect(first.bounds.max[1]).toBeGreaterThan(first.bounds.min[1]);
  });
});
