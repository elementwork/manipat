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
  it("derives closed adjacency and verifies cube/prism/pyramid nets", () => {
    for (const polyhedron of POLYHEDRA) {
      const adjacency = buildFaceAdjacency(polyhedron);
      expect(adjacency.length).toBeGreaterThanOrEqual(polyhedron.faces.length);
      expect(verifyNet(polyhedron, createNet(polyhedron)), polyhedron.id).toEqual({ valid: true, errors: [] });
      using preview = createFormDevelopmentPreview(polyhedron);
      expect(preview.surface.geometry.getAttribute("position").count).toBe(polyhedron.vertices.length);
      expect(preview.disposed).toBe(false);
    }
  });

  it("generates 2,000 uniquely foldable marked questions", () => {
    const polyhedra = new Set<string>();
    for (let index = 0; index < 2_000; index += 1) {
      const question = generateFormDevelopmentQuestion(`form-${index}`, ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5);
      expect(validateFormDevelopmentQuestion(question).matchingChoiceIndices).toEqual([question.correctChoiceIndex]);
      polyhedra.add(question.prompt.polyhedron.id);
    }
    expect(polyhedra).toEqual(new Set(["cube", "triangular-prism", "square-pyramid"]));
  }, 60_000);
});
