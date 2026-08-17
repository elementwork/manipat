import { createRandomSource } from "@manipat/core";
import { createManifoldKernel, validateGeometryQuality } from "@manipat/geometry";
import { describe, expect, it } from "vitest";
import {
  APERTURE_ADVANCED_TEMPLATES,
  APERTURE_TEMPLATES,
  TFE_ADVANCED_TEMPLATES,
} from "../src/index.js";

describe("object template banks", () => {
  it("retains ten deterministic foundation aperture templates", async () => {
    const kernel = await createManifoldKernel();
    expect(APERTURE_TEMPLATES).toHaveLength(10);
    for (const objectTemplate of APERTURE_TEMPLATES) {
      const generated = objectTemplate.instantiate({
        kernel,
        seed: `${objectTemplate.id}:fixture`,
        random: createRandomSource(`${objectTemplate.id}:fixture`),
      });
      using solid = generated.solid;
      const quality = validateGeometryQuality(kernel, solid);
      expect(quality.passed, `${objectTemplate.id}: ${quality.errors.join(", ")}`).toBe(true);
    }
  });

  it("provides valid golden-complex Keyhole models with multiple semantic features", async () => {
    const kernel = await createManifoldKernel();
    expect(APERTURE_ADVANCED_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    for (const objectTemplate of APERTURE_ADVANCED_TEMPLATES) {
      const generated = objectTemplate.instantiate({
        kernel,
        seed: `${objectTemplate.id}:advanced-fixture`,
        random: createRandomSource(`${objectTemplate.id}:advanced-fixture`),
      });
      using solid = generated.solid;
      const quality = validateGeometryQuality(kernel, solid);
      expect(quality.passed, `${objectTemplate.id}: ${quality.errors.join(", ")}`).toBe(true);
      expect(generated.provenance.length, `${objectTemplate.id} feature count`).toBeGreaterThanOrEqual(4);
    }
  });

  it("provides valid golden-complex TFE models with multiple semantic features", async () => {
    const kernel = await createManifoldKernel();
    expect(TFE_ADVANCED_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    for (const objectTemplate of TFE_ADVANCED_TEMPLATES) {
      const generated = objectTemplate.instantiate({
        kernel,
        seed: `${objectTemplate.id}:advanced-fixture`,
        random: createRandomSource(`${objectTemplate.id}:advanced-fixture`),
      });
      using solid = generated.solid;
      const quality = validateGeometryQuality(kernel, solid);
      expect(quality.passed, `${objectTemplate.id}: ${quality.errors.join(", ")}`).toBe(true);
      expect(generated.provenance.length, `${objectTemplate.id} feature count`).toBeGreaterThanOrEqual(4);
    }
  });
});
