import { canonicalStringify, type JsonValue } from "@manipat/core";
import { describe, expect, it } from "vitest";
import {
  createApertureGenerator,
  validateApertureQuestion,
} from "../src/index.js";

describe("ApertureGenerator", () => {
  it("reproduces complete questions from a seed", async () => {
    const generator = await createApertureGenerator();
    const first = generator.generate("aperture-replay-001", 3);
    const second = generator.generate("aperture-replay-001", 3);
    expect(canonicalStringify(first as unknown as JsonValue)).toBe(
      canonicalStringify(second as unknown as JsonValue),
    );
  });

  it("generates 1,000 valid candidates with complex source geometry at hard bands", async () => {
    const generator = await createApertureGenerator();
    const templates = new Set<string>();
    let advancedTemplateCount = 0;
    for (let index = 0; index < 1_000; index += 1) {
      const band = ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5;
      const question = generator.generate(`phase1-${index}`, band);
      const validation = validateApertureQuestion(question);
      expect(validation.passed, `seed phase1-${index}`).toBe(true);
      expect(validation.matchingChoiceIndices).toEqual([question.correctChoiceIndex]);
      expect(new Set(question.choices.map(({ svg }) => svg)).size).toBe(5);
      expect(Number(question.metadata.pictorialSubdivisions ?? 0)).toBe(12);
      expect(Number(question.metadata.projectionComplexity ?? 0)).toBeGreaterThanOrEqual(
        band === 1 ? 4 : band === 2 ? 5 : 6,
      );
      if (question.metadata.modelTier === "golden-complex-v3") advancedTemplateCount += 1;
      if (band >= 4) {
        expect(question.metadata.modelTier, `seed phase1-${index}`).toBe("golden-complex-v3");
        expect(Number(question.metadata.semanticFeatureCount ?? 0)).toBeGreaterThanOrEqual(4);
      }
      templates.add(question.templateId);
    }
    expect(templates.size).toBeGreaterThanOrEqual(16);
    expect(advancedTemplateCount).toBeGreaterThan(500);
  }, 180_000);

  it("rejects a duplicated choice", async () => {
    const generator = await createApertureGenerator();
    const question = generator.generate("duplicate-check", 2);
    const tampered = {
      ...question,
      choices: [question.choices[0], question.choices[0], ...question.choices.slice(2)],
    };
    expect(validateApertureQuestion(tampered).passed).toBe(false);
  });
});