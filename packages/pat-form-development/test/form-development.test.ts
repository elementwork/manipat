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
      expect(verifyNet(polyhedron, createNet(polyhedron)), polyhedron.id).toEqual({ valid: true, errors: [] });
      using preview = createFormDevelopmentPreview(polyhedron);
      expect(preview.surface.geometry.getAttribute("position").count).toBe(polyhedron.vertices.length);
      expect(preview.disposed).toBe(false);
    }
  });

  it("generates 2,000 uniquely foldable, continuously varied geometric questions", () => {
    const polyhedra = new Set<string>();
    const geometries = new Set<string>();
    for (let index = 0; index < 2_000; index += 1) {
      const question = generateFormDevelopmentQuestion(`form-${index}`, ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5);
      const validation = validateFormDevelopmentQuestion(question);
      expect(validation.matchingChoiceIndices).toEqual([question.correctChoiceIndex]);
      expect(validation.passed).toBe(true);
      expect(new Set(question.choices.map(({ svg }) => svg)).size).toBe(4);
      expect(new Set(question.choices.map(({ viewQuarterTurns }) => viewQuarterTurns)).size).toBe(4);
      expect(question.choices.every(({ vertices }) =>
        vertices !== undefined && vertices.length === question.prompt.polyhedron.vertices.length)).toBe(true);
      expect(question.choices.every(({ svg }) =>
        (svg.match(/<polygon\b/gu)?.length ?? 0) >= question.prompt.polyhedron.faces.length)).toBe(true);
      expect(question.explanation.markedFaces).toEqual([]);
      expect(question.metadata.geometryVariation).toBe("continuous-parameters");
      polyhedra.add(question.prompt.polyhedron.id);
      geometries.add(question.fingerprints.net);
    }
    expect(polyhedra).toEqual(new Set(["trapezoidal-prism", "house-prism"]));
    expect(geometries.size).toBeGreaterThan(1_900);
  }, 60_000);
});
