import { describe, expect, it } from "vitest";
import { createPatEngine, renderExamHtml } from "@manipat/question-bank";
import { buildPortableStudyExam } from "../src/study-exam.js";

describe("portable study exam shell", () => {
  it("preserves the canonical exam and adds answer/explanation tools plus one all-in-one hint viewer", async () => {
    const engine = await createPatEngine();
    const angle = await engine.generate({ type: "angle", seed: "study-angle", difficulty: 1 });
    const paper = await engine.generate({ type: "paper-folding", seed: "study-paper", difficulty: 1 });
    const questions = [angle, paper] as const;
    const source = renderExamHtml(questions, {
      seed: "study-shell",
      profile: "test",
      difficulty: "1",
      engineVersion: engine.engineVersion,
      cliVersion: "test",
      requestedCategoryCounts: { angle: 1, "paper-folding": 1 },
      acceptedCategoryCounts: { angle: 1, "paper-folding": 1 },
      difficultyDistribution: { "1": 2 },
    });
    const viewerHtml = "<!doctype html><html><body>embedded viewer</body></html>";
    const html = buildPortableStudyExam(source, questions, new Set([paper.id]), viewerHtml);

    expect(html).toContain("ManipAT Portable Study Exam");
    expect(html).toContain('name="manipat-viewer-mode" content="portable"');
    expect(html).toContain("Answer Sheet");
    expect(html).toContain("manipat-exam-data");
    expect(html).toContain("Study Tools");
    expect(html).toContain("Check Answer");
    expect(html).toContain("Show Explanation");
    expect(html).toContain("Interactive Hint");
    expect(html).toContain("No interactive hint for this 2D category");
    expect(html).toContain("Explore folding");
    expect(html).toContain("Measured angles");
    expect(html).toContain("Reverse-unfold order");
    expect(html).toContain("@media print");

    const match = /<script id="manipat-study-data" type="application\/json">([^<]+)<\/script>/u.exec(html);
    if (match?.[1] === undefined) throw new Error("Study data script missing");
    const data = JSON.parse(match[1]) as {
      questions: Array<{ id: string; interactive: boolean; answer: string }>;
      viewerHtmlBase64: string;
    };
    expect(data.questions).toHaveLength(2);
    expect(data.questions[0]).toMatchObject({ id: angle.id, interactive: false });
    expect(data.questions[1]).toMatchObject({ id: paper.id, interactive: true });
    expect(data.questions.every(({ answer }) => answer.length > 0)).toBe(true);
    expect(Buffer.from(data.viewerHtmlBase64, "base64").toString("utf8")).toBe(viewerHtml);
  }, 30_000);
});
