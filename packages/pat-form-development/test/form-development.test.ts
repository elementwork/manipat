import { describe, expect, it } from "vitest";
import {
  POLYHEDRA,
  buildFaceAdjacency,
  createNet,
  createFormDevelopmentPreview,
  generateFormDevelopmentQuestion,
  validateFormDevelopmentQuestion,
  verifyNet,
} from "../src/index.js";

describe("form development", () => {
  it("derives closed adjacency and verifies supported reference nets", () => {
    for (const polyhedron of POLYHEDRA) {
      const adjacency = buildFaceAdjacency(polyhedron);
      expect(adjacency.length).toBeGreaterThanOrEqual(polyhedron.faces.length);
      for (const variant of [0, 1, 2]) {
        expect(verifyNet(polyhedron, createNet(polyhedron, variant)), `${polyhedron.id}:${variant}`).toEqual({ valid: true, errors: [] });
      }
      using preview = createFormDevelopmentPreview(polyhedron);
      expect(preview.surface.geometry.getAttribute("position").count).toBe(polyhedron.vertices.length);
      expect(preview.disposed).toBe(false);
    }
  });

  it("generates 2,000 uniquely foldable questions with varied golden-style nets", () => {
    const polyhedra = new Set<string>();
    const geometries = new Set<string>();
    const netLayouts = new Set<string>();
    for (let index = 0; index < 2_000; index += 1) {
      const band = ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5;
      const question = generateFormDevelopmentQuestion(`form-${index}`, band);
      const validation = validateFormDevelopmentQuestion(question);
      expect(validation.matchingChoiceIndices).toEqual([question.correctChoiceIndex]);
      expect(validation.passed).toBe(true);
      expect(new Set(question.choices.map(({ svg }) => svg)).size).toBe(4);
      expect(new Set(question.choices.map(({ viewQuarterTurns }) => viewQuarterTurns)).size).toBe(4);
      expect(question.choices.every(({ vertices }) =>
        vertices !== undefined && vertices.length === question.prompt.polyhedron.vertices.length)).toBe(true);
      expect(question.choices.every(({ svg }) => {
        const visibleFaceCount = svg.match(/<polygon\b/gu)?.length ?? 0;
        return visibleFaceCount >= 3 && visibleFaceCount < question.prompt.polyhedron.faces.length;
      })).toBe(true);
      expect(question.explanation.markedFaces).toEqual([]);
      expect(question.metadata.geometryVariation).toBe("continuous-parameters");
      expect(["strip-split-a", "strip-split-b", "fan-hub"]).toContain(question.metadata.netLayoutStyle);
      if (band >= 4) {
        expect(question.metadata.modelTier, `seed form-${index}`).toBe("golden-complex-v3");
        expect(question.prompt.polyhedron.faces.length, `seed form-${index}`).toBeGreaterThanOrEqual(8);
        expect(question.prompt.polyhedron.id.startsWith("profile-")).toBe(true);
      }
      polyhedra.add(question.prompt.polyhedron.id);
      geometries.add(question.fingerprints.net);
      netLayouts.add(String(question.metadata.netLayoutStyle));
    }
    expect(polyhedra).toEqual(new Set([
      "trapezoidal-prism",
      "house-prism",
      "profile-asymmetric-crown",
      "profile-chamfered-octagon",
      "profile-clipped-roof",
    ]));
    expect(netLayouts).toEqual(new Set(["strip-split-a", "strip-split-b", "fan-hub"]));
    expect(geometries.size).toBeGreaterThan(1_900);
  }, 120_000);
});
