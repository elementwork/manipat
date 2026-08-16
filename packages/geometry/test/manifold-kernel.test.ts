import { describe, expect, it } from "vitest";
import { createManifoldKernel } from "../src/index.js";

describe("ManifoldKernel", () => {
  it("creates, validates, meshes, and projects a centered cube", async () => {
    const kernel = await createManifoldKernel();
    using cube = kernel.cube([2, 4, 6], true);

    const validation = kernel.validate(cube);
    expect(validation.valid).toBe(true);
    expect(validation.volume).toBeCloseTo(48);

    const mesh = kernel.getMesh(cube);
    expect(mesh.vertexCount).toBe(8);
    expect(mesh.triangleCount).toBe(12);
    expect(mesh.bounds).toEqual({ min: [-1, -2, -3], max: [1, 2, 3] });

    using projection = kernel.projectXY(cube);
    const section = kernel.getSection(projection);
    expect(section.bounds).toEqual({ min: [-1, -2], max: [1, 2] });
    expect(section.polygons).toHaveLength(1);
  });

  it("rejects access after explicit disposal", async () => {
    const kernel = await createManifoldKernel();
    const cube = kernel.cube([1, 1, 1]);
    cube.dispose();
    expect(() => kernel.getMesh(cube)).toThrow(ReferenceError);
  });
});
