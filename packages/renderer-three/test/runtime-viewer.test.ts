import { LineDashedMaterial, Scene } from "three";
import { describe, expect, it } from "vitest";
import {
  createFrontCamera,
  createInteractiveRuntimeViewer,
  createVoxelInstancedRender,
} from "../src/index.js";

describe("interactive runtime foundations", () => {
  it("fails clearly when mounted outside a browser WebGL environment", () => {
    expect(() => createInteractiveRuntimeViewer(
      {} as HTMLElement,
      new Scene(),
      createFrontCamera(),
    )).toThrow(/browser DOM\/WebGL environment/);
  });

  it("supports voxel highlighting plus surface, edge, and hidden-line controls", () => {
    using voxels = createVoxelInstancedRender([[0, 0, 0], [1, 0, 0], [0, 1, 0]]);
    voxels.setHighlighted([1]);
    expect(voxels.mesh.instanceColor).not.toBeNull();
    voxels.clearHighlight();
    expect(() => voxels.setHighlighted([3])).toThrow(RangeError);

    expect(voxels.edges.visible).toBe(true);
    expect(voxels.hiddenEdges.visible).toBe(false);
    expect(voxels.depthOccluder.visible).toBe(false);
    voxels.setGhosted(true);
    expect(voxels.mesh.material).toMatchObject({ transparent: true, opacity: 0.18 });
    expect(voxels.hiddenEdges.visible).toBe(true);
    expect(voxels.hiddenEdges.material).toBeInstanceOf(LineDashedMaterial);
    expect(voxels.depthOccluder.visible).toBe(true);

    voxels.setSurfaceVisible(false);
    expect(voxels.mesh.visible).toBe(false);
    voxels.setEdgesVisible(false);
    expect(voxels.edges.visible).toBe(false);
    expect(voxels.hiddenEdges.visible).toBe(false);
    expect(voxels.depthOccluder.visible).toBe(false);
    voxels.setEdgesVisible(true);
    expect(voxels.hiddenEdges.visible).toBe(true);
  });
});
