import { createRandomSource } from "@manipat/core";
import { createManifoldKernel, validateGeometryQuality } from "@manipat/geometry";
import { describe, expect, it } from "vitest";
import { APERTURE_TEMPLATES } from "../src/index.js";

describe("Phase 1 object templates", () => {
  it("provides ten deterministic, valid aperture templates", async () => {
    const kernel = await createManifoldKernel();
    expect(APERTURE_TEMPLATES).toHaveLength(10);
    for (const objectTemplate of APERTURE_TEMPLATES) {
      using generated = objectTemplate.instantiate({
        kernel,
        seed: `${objectTemplate.id}:fixture`,
        random: createRandomSource(`${objectTemplate.id}:fixture`),
      }).solid;
      const quality = validateGeometryQuality(kernel, generated);
      expect(quality.passed, `${objectTemplate.id}: ${quality.errors.join(", ")}`).toBe(true);
    }
  });
});
