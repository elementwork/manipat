import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PAT_CATEGORIES,
  QuestionDuplicateDetector,
  createPatEngine,
  extractExamQuestions,
  generateBatch,
  persistBatch,
  questionContentFingerprint,
  renderExamHtml,
  serializeQuestion,
  readPersistedQuestions,
} from "../src/index.js";

describe("unified question engine and storage", () => {
  it("generates and validates every category", async () => {
    const engine = await createPatEngine();
    for (const type of PAT_CATEGORIES) {
      const question = await engine.generate({ type, seed: `engine:${type}`, difficulty: 3 });
      expect(engine.validate(question), type).toMatchObject({ passed: true, type });
      expect(engine.render(question).length, `${type} assets`).toBeGreaterThan(0);
    }
  });

  it("batches, deduplicates, and persists deterministic JSONL plus assets", async () => {
    const engine = await createPatEngine();
    const categories = Object.fromEntries(PAT_CATEGORIES.map((type) => [type, 2]));
    const result = await generateBatch(engine, { seed: "bank-test", categories, difficulty: [2, 4] });
    expect(result.questions).toHaveLength(12);
    expect(new Set(result.questions.map(({ id }) => id)).size).toBe(12);
    expect(new Set(result.questions.map(questionContentFingerprint)).size).toBe(12);
    expect(result.stats.generated).toBeGreaterThanOrEqual(result.stats.accepted);
    for (const question of result.questions) {
      expect(serializeQuestion(await engine.regenerate(question))).toBe(serializeQuestion(question));
    }
    const directory = await mkdtemp(path.join(tmpdir(), "manipat-bank-"));
    await persistBatch(result, {
      outputDirectory: directory,
      seed: "bank-test",
      profile: "test",
      difficulty: "2-4",
      engineVersion: engine.engineVersion,
      cliVersion: "0.1.0",
    });
    expect(await readPersistedQuestions(directory)).toHaveLength(12);
    expect(JSON.parse(await readFile(path.join(directory, "validation-report.json"), "utf8"))).toMatchObject({ passed: true, questionCount: 12 });
  }, 60_000);

  it("seeds duplicate detection from a previous batch", async () => {
    const engine = await createPatEngine();
    const original = await engine.generate({ type: "angle", seed: "cross-batch", difficulty: 3 });
    const different = await engine.generate({ type: "angle", seed: "cross-batch-2", difficulty: 3 });
    const detector = new QuestionDuplicateDetector([original]);
    expect(detector.accept(original)).toBe(false);
    expect(detector.accept(different)).toBe(true);
  });

  it("renders a self-contained exam that preserves canonical questions", async () => {
    const engine = await createPatEngine();
    const questions = await Promise.all(PAT_CATEGORIES.map((type) => engine.generate({
      type,
      seed: `exam-html:${type}`,
      difficulty: 3,
    })));
    const html = renderExamHtml(questions, {
      seed: "exam-html",
      profile: "test",
      difficulty: "3",
      engineVersion: engine.engineVersion,
      cliVersion: "0.1.0",
      requestedCategoryCounts: Object.fromEntries(PAT_CATEGORIES.map((type) => [type, 1])),
      acceptedCategoryCounts: Object.fromEntries(PAT_CATEGORIES.map((type) => [type, 1])),
      difficultyDistribution: { 3: PAT_CATEGORIES.length },
    });
    expect(html).toContain("manipat-exam-data");
    expect(html).toContain("@page{size:letter portrait");
    expect(html).toContain("data-exam-question");
    expect(html).toContain("print-break");
    expect(html).toContain('class="question-row"');
    expect(html).toContain('font-family="Arial, Helvetica, sans-serif"');
    expect(html).not.toContain("Review answers");
    expect(html).not.toContain("Timer:");
    expect(html).not.toMatch(/<link|<script[^>]+src=/i);
    expect(extractExamQuestions(html).map(serializeQuestion)).toEqual(questions.map(serializeQuestion));
  });

  it("honors weighted difficulty targets for grouped cube questions", async () => {
    const engine = await createPatEngine();
    const result = await generateBatch(engine, {
      seed: "difficulty-mix",
      categories: { "cube-counting": 10 },
      difficulty: { kind: "mix", weights: { 1: 1, 5: 1 } },
    });
    expect(result.stats.acceptedByDifficulty).toEqual({ 1: 5, 5: 5 });
  });
});
