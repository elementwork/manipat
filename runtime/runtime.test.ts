import { describe, expect, it } from "vitest";
import {
  MANIPAT_QUESTION_SCHEMA_VERSION,
  MANIPAT_RUNTIME_VERSION,
  createPatRuntime,
} from "./dist/index.js";

describe("@manipat/runtime", () => {
  it("generates a validated 2D question without exposing scoring truth", async () => {
    const runtime = await createPatRuntime();
    const generated = await runtime.generateQuestion({
      type: "angle",
      seed: "runtime-public-dto-angle",
      difficulty: 3,
    });

    expect(runtime.getEngineInfo()).toMatchObject({
      runtimeVersion: MANIPAT_RUNTIME_VERSION,
      questionSchemaVersion: MANIPAT_QUESTION_SCHEMA_VERSION,
      engineVersion: "0.1.0",
    });
    expect(generated.publicQuestion.category).toBe("angle");
    expect(generated.publicQuestion.choiceCount).toBe(4);
    expect(generated.publicQuestion.choices).toHaveLength(4);

    const activePayload = JSON.stringify(generated.publicQuestion);
    expect(activePayload).not.toContain("runtime-public-dto-angle");
    expect(activePayload).not.toContain("correctChoiceIndex");
    expect(activePayload).not.toContain("canonicalQuestionId");
    expect(activePayload).not.toContain("explanation");
    expect(activePayload).not.toContain("fingerprints");
    expect(activePayload).not.toContain("validation");

    expect(generated.privateRecord.seed).toBe("runtime-public-dto-angle");
    expect(generated.privateRecord.correctChoiceIndex).toBeGreaterThanOrEqual(0);
    expect(generated.privateRecord.correctChoiceIndex).toBeLessThan(4);
    expect(generated.privateRecord.solution.explanationHtml.length).toBeGreaterThan(0);
  });

  it("exports the complete consecutive Paper Folding prompt without changing page orientation", async () => {
    const runtime = await createPatRuntime();
    const generated = await runtime.generateQuestion({
      type: "paper-folding",
      seed: "runtime-paper-sequence",
      difficulty: 4,
    });
    const assets = generated.publicQuestion.promptAssets;

    expect(assets.length).toBeGreaterThanOrEqual(3);
    expect(assets[0]?.svg).toContain('data-original-sheet="true"');
    expect(assets.at(-1)?.svg).toContain("<title>Paper folding punch</title>");
    expect(assets.every(({ svg }) => svg.includes('viewBox="-0.2 -0.2 4.4 4.4"'))).toBe(true);
    expect(assets.every(({ svg }) =>
      !/transform\s*=\s*["'][^"']*(?:rotate\s*\(|scale\s*\(\s*-)/iu.test(svg))).toBe(true);
    assets.slice(1, -1).forEach(({ svg }, index) => {
      expect(svg).toContain(`<title>Paper folding fold ${index + 1}</title>`);
    });
  });

  it("reproduces a generated question from the trusted private record", async () => {
    const runtime = await createPatRuntime();
    const generated = await runtime.generateQuestion({
      type: "paper-folding",
      seed: "runtime-regeneration-paper",
      difficulty: 4,
    });
    const regenerated = await runtime.regenerate(generated.privateRecord);

    expect(regenerated.privateRecord.canonicalQuestionId).toBe(
      generated.privateRecord.canonicalQuestionId,
    );
    expect(regenerated.publicQuestion).toEqual(generated.publicQuestion);
    expect(regenerated.privateRecord.solution).toEqual(generated.privateRecord.solution);
  });
});
