import { Scene } from "three";
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

  it("supports deterministic per-voxel explanation highlighting", () => {
    using voxels = createVoxelInstancedRender([[0, 0, 0], [1, 0, 0], [0, 1, 0]]);
    voxels.setHighlighted([1]);
    expect(voxels.mesh.instanceColor).not.toBeNull();
    voxels.clearHighlight();
    expect(() => voxels.setHighlighted([3])).toThrow(RangeError);
  });
});
