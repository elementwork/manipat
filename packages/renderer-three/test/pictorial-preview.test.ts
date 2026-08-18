import { createRandomSource } from "@manipat/core";
import {
  createManifoldKernel,
  normalizeSolid,
} from "@manipat/geometry";
import { APERTURE_TEMPLATES } from "../../object-generator/src/index.js";
import { Box3, LineDashedMaterial, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { createPictorialPreview } from "../src/index.js";

describe("pictorial previews", () => {
  it("frames every Phase 1 template without clipping", async () => {
    const kernel = await createManifoldKernel();
    for (const template of APERTURE_TEMPLATES) {
      const generated = template.instantiate({
        kernel,
        seed: `preview:${template.id}`,
        random: createRandomSource(`preview:${template.id}`),
      });
      using source = generated.solid;
      const normalizedResult = normalizeSolid(kernel, source);
      using normalized = normalizedResult.solid;
      const mesh = kernel.getMesh(normalized);
      using preview = createPictorialPreview(mesh);

      const box = new Box3(
        new Vector3(...mesh.bounds.min),
        new Vector3(...mesh.bounds.max),
      );
      const center = box.getCenter(new Vector3());
      for (const x of [box.min.x, box.max.x]) {
        for (const y of [box.min.y, box.max.y]) {
          for (const z of [box.min.z, box.max.z]) {
            const projected = new Vector3(x, y, z).sub(center).project(preview.camera);
            expect(Math.abs(projected.x), `${template.id} x clipping`).toBeLessThanOrEqual(1);
            expect(Math.abs(projected.y), `${template.id} y clipping`).toBeLessThanOrEqual(1);
            expect(Math.abs(projected.z), `${template.id} depth clipping`).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it("supports color coding, rotation, highlighting, ghost hidden lines, and projection overlays", async () => {
    const kernel = await createManifoldKernel();
    using cube = kernel.cube([100, 80, 60], true);
    const mesh = { ...kernel.getMesh(cube), groups: [{ featureId: "body", start: 0, count: 6 }] };
    using preview = createPictorialPreview(mesh);
    preview.setRotation([10, 20, 30]);
    expect(preview.object.rotation.x).toBeCloseTo(Math.PI / 18);
    preview.highlightFeature("body");
    expect(preview.object.getObjectByName("selection-highlight")).toBeDefined();

    expect(preview.semanticSurface.visible).toBe(false);
    expect(preview.semanticSurface.geometry.getAttribute("color").count).toBe(mesh.triangleCount * 3);
    preview.setColorCoded(true);
    expect(preview.surface.visible).toBe(false);
    expect(preview.semanticSurface.visible).toBe(true);
    preview.setSurfaceVisible(false);
    expect(preview.semanticSurface.visible).toBe(false);
    preview.setSurfaceVisible(true);
    expect(preview.semanticSurface.visible).toBe(true);

    expect(preview.hiddenEdges.visible).toBe(false);
    preview.setGhosted(true);
    expect(preview.semanticSurface.material).toMatchObject({ transparent: true, opacity: 0.24 });
    expect(preview.hiddenEdges.visible).toBe(true);
    expect(preview.hiddenEdges.material).toBeInstanceOf(LineDashedMaterial);
    preview.setEdgesVisible(false);
    expect(preview.edges.visible).toBe(false);
    expect(preview.hiddenEdges.visible).toBe(false);
    preview.setEdgesVisible(true);
    expect(preview.hiddenEdges.visible).toBe(true);

    preview.setColorCoded(false);
    expect(preview.surface.visible).toBe(true);
    expect(preview.semanticSurface.visible).toBe(false);

    preview.addProjectionPlane();
    expect(preview.object.getObjectByName("projection-plane")).toBeDefined();
  });
});
