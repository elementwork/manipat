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

  it("generates 1,000 uniquely solvable, structurally varied questions", async () => {
    const generator = await createTfeGenerator();
    const templates = new Set<string>();
    const missingViews = new Set<string>();
    for (let index = 0; index < 1_000; index += 1) {
      const question = generator.generate(`tfe-${index}`, ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5);
      const validation = validateTfeQuestion(question);
      expect(validation.passed, `seed tfe-${index}`).toBe(true);
      expect(validation.matchingChoiceIndices).toEqual([question.correctChoiceIndex]);
      expect(new Set(question.choices.map(({ svg }) => svg)).size).toBe(4);
      expect(new Set(question.choices.flatMap(({ mutation }) => mutation === undefined ? [] : [mutation])).size).toBeGreaterThanOrEqual(2);
      expect(question.templateId.startsWith("TFE")).toBe(true);
      templates.add(question.templateId);
      missingViews.add(question.prompt.missingView);
    }
    expect(templates).toEqual(new Set([
      "TFE01-stepped-corner",
      "TFE02-top-front-pocket",
      "TFE03-bridge",
      "TFE04-terrace",
      "TFE05-corner-notch",
      "TFE06-crossing-ribs",
    ]));
    expect(missingViews).toEqual(new Set(["front", "top", "end"]));
  }, 120_000);
});
