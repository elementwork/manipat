import { describe, expect, it } from "vitest";
import {
  FRONT_FRAME,
  createManifoldKernel,
  createOrthographicView,
  extractLogicalTopology,
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
});
