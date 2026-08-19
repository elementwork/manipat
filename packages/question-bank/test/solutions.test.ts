import { describe, expect, it } from "vitest";
import {
  PAT_CATEGORIES,
  augmentExamHtmlWithSolutions,
  correctAnswerDisplay,
  createPatEngine,
  renderExamHtml,
  renderQuestionExplanationHtml,
  type AnyPatQuestion,
} from "../src/index.js";

const buildQuestions = async (): Promise<readonly AnyPatQuestion[]> => {
  const engine = await createPatEngine();
  const questions: AnyPatQuestion[] = [];
  for (const type of PAT_CATEGORIES) {
    questions.push(await engine.generate({
      type,
      seed: `solutions-test:${type}`,
      difficulty: 1,
    }));
  }
  return questions;
};

const examOptions = (questions: readonly AnyPatQuestion[]) => ({
  seed: "solutions-test",
  profile: "test",
  difficulty: "1",
  engineVersion: "test",
  cliVersion: "test",
  requestedCategoryCounts: Object.fromEntries(PAT_CATEGORIES.map((type) => [type, 1])),
  acceptedCategoryCounts: Object.fromEntries(PAT_CATEGORIES.map((type) => [type, 1])),
  difficultyDistribution: { "1": questions.length },
});

describe("printable answer keys and explanations", () => {
  it("keeps none unchanged and renders key/full appendices from canonical explanation data", async () => {
    const questions = await buildQuestions();
    const base = renderExamHtml(questions, examOptions(questions));

    const none = augmentExamHtmlWithSolutions(base, questions, "none");
    expect(none).toBe(base);
    expect(none).not.toContain("Answer Key");

    const key = augmentExamHtmlWithSolutions(base, questions, "key");
    expect(key).toContain("Answer Key");
    expect(key).not.toContain("Solutions &amp; Explanations");
    questions.forEach((question, index) => {
      expect(key).toContain(`<span>${index + 1}</span><strong>${correctAnswerDisplay(question)}</strong>`);
    });

    const full = augmentExamHtmlWithSolutions(base, questions, "full");
    expect(full).toContain("Answer Key");
    expect(full).toContain("Solutions &amp; Explanations");
    expect(full.match(/data-solution-question=/gu)).toHaveLength(questions.length);
    for (const question of questions) {
      const explanation = renderQuestionExplanationHtml(question);
      expect(explanation.length).toBeGreaterThan(40);
      expect(full).toContain(explanation);
    }
  }, 60_000);
});
