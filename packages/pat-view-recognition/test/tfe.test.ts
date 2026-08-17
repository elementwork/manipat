import { canonicalStringify, type JsonValue } from "@manipat/core";
import { describe, expect, it } from "vitest";
import {
  createTfeGenerator,
  validateTfeQuestion,
} from "../src/index.js";

describe("TfeGenerator", () => {
  it("reproduces complete questions from a seed", async () => {
    const generator = await createTfeGenerator();
    const first = generator.generate("tfe-replay", 3);
    const second = generator.generate("tfe-replay", 3);
    expect(canonicalStringify(first as unknown as JsonValue)).toBe(
      canonicalStringify(second as unknown as JsonValue),
    );
  });

  it("generates 1,000 uniquely solvable questions with golden-complex hard models", async () => {
    const generator = await createTfeGenerator();
    const templates = new Set<string>();
    const missingViews = new Set<string>();
    let advancedTemplateCount = 0;
    for (let index = 0; index < 1_000; index += 1) {
      const band = ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5;
      const question = generator.generate(`tfe-${index}`, band);
      const validation = validateTfeQuestion(question);
      expect(validation.passed, `seed tfe-${index}`).toBe(true);
      expect(validation.matchingChoiceIndices).toEqual([question.correctChoiceIndex]);
      expect(new Set(question.choices.map(({ svg }) => svg)).size).toBe(4);
      expect(new Set(question.choices.flatMap(({ mutation }) => mutation === undefined ? [] : [mutation])).size).toBeGreaterThanOrEqual(2);
      expect(question.templateId.startsWith("TFE")).toBe(true);
      expect(Number(question.metadata.totalProjectionInformation ?? 0)).toBeGreaterThanOrEqual(
        Number(question.metadata.targetInformation ?? 0),
      );
      if (question.metadata.modelTier === "golden-complex-v3") advancedTemplateCount += 1;
      if (band >= 4) {
        expect(question.metadata.modelTier, `seed tfe-${index}`).toBe("golden-complex-v3");
        expect(Number(question.metadata.semanticFeatureCount ?? 0)).toBeGreaterThanOrEqual(4);
      }
      templates.add(question.templateId);
      missingViews.add(question.prompt.missingView);
    }
    expect(templates.size).toBeGreaterThanOrEqual(10);
    expect(advancedTemplateCount).toBeGreaterThan(500);
    expect(missingViews).toEqual(new Set(["front", "top", "end"]));
  }, 180_000);
});
