import { createPatEngine } from "@manipat/question-bank";
import { describe, expect, it } from "vitest";
import { buildVisualizationPayload } from "../src/visualize.js";
import { renderViewerHtml } from "../src/viewer-server.js";
import type { PaperGuidePayload } from "../src/viewer-payload.js";

const originalSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.2 -0.2 4.4 4.4"><title>Original</title></svg>';
const foldSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.2 -0.2 4.4 4.4"><title>Fold 1</title></svg>';
const punchSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.2 -0.2 4.4 4.4"><title>Punch</title></svg>';
const overviewSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 350"></svg>';

const paperPayload: PaperGuidePayload = {
  kind: "paper-guide",
  questionId: "paper-layout-test",
  category: "paper-folding",
  title: "Paper layout test",
  overviewSvg,
  questionSvgs: [originalSvg, foldSvg, punchSvg],
  correctSvg: originalSvg,
  punches: [{ point: [1.5, 1.5], layerCount: 2 }],
  steps: [
    {
      kind: "punch",
      title: "Punch",
      completedFoldCount: 1,
      baseSvg: punchSvg,
      holes: [[1.5, 1.5]],
      newHoles: [],
      departedHoles: [],
      affectedLayerCount: 0,
    },
    {
      kind: "unfold",
      title: "Reverse fold 1",
      completedFoldCount: 0,
      baseSvg: originalSvg,
      holes: [[1.5, 1.5], [2.5, 1.5]],
      newHoles: [[2.5, 1.5]],
      departedHoles: [[1.5, 1.5]],
      affectedLayerCount: 1,
      foldLine: { point: [2, 0], unitDirection: [0, 1] },
    },
  ],
  foldAnimations: [{
    foldId: "fold-1",
    line: { point: [2, 0], unitDirection: [0, 1] },
    stationaryPolygons: [[[0, 0], [2, 0], [2, 4], [0, 4]]],
    movingPolygons: [[[2, 0], [4, 0], [4, 4], [2, 4]]],
  }],
};

describe("interactive viewer HTML", () => {
  it("builds the canonical Original → folds → Punch payload used by the walkthrough", async () => {
    const engine = await createPatEngine();
    const question = await engine.generate({
      type: "paper-folding",
      seed: "viewer-paper-sequence",
      difficulty: 4,
    });
    expect(question.type).toBe("paper-folding");
    if (question.type !== "paper-folding") return;

    const payload = await buildVisualizationPayload(question);
    expect(payload.kind).toBe("paper-guide");
    if (payload.kind !== "paper-guide") return;
    expect(payload.questionSvgs).toHaveLength(question.prompt.folds.length + 2);
    expect(payload.questionSvgs[0]).toBe(question.prompt.originalSvg);
    expect(payload.questionSvgs.slice(1)).toEqual(question.prompt.stepSvgs);
    expect(payload.overviewSvg).toContain("Original");
    expect(payload.overviewSvg).toContain("Fold 1");
    expect(payload.overviewSvg).toContain("Punch");
    expect(payload.steps.at(-1)?.baseSvg).toBe(question.prompt.originalSvg);
  });

  it("renders Paper Punching as one split workspace with synchronized step and playback controls", () => {
    const html = renderViewerHtml([paperPayload]);

    expect(html).toContain('class="paper-panel paper-left"');
    expect(html).toContain('id="paper-overview"');
    expect(html).toContain('class="paper-panel paper-right"');
    expect(html).toContain('id="paper-animation-view"');
    expect(html).toContain('id="paper-previous-step"');
    expect(html).toContain('id="paper-next-step"');
    expect(html).toContain('id="paper-play"');
    expect(html).toContain('id="paper-pause"');
    expect(html).toContain('id="paper-speed"');

    expect(html).toContain("const expectedQuestionFrameCount = payload.foldAnimations.length + 2");
    expect(html).toContain("Paper timeline requires Original + one frame per fold + Punch");
    expect(html).toContain("svg: payload.questionSvgs[0] ?? blankSheetSvg()");
    expect(html).toContain("const foldCount = payload.foldAnimations.length");
    expect(html).toContain("svg: payload.questionSvgs[index + 1] ?? blankSheetSvg()");
    expect(html).toContain("forward → reverse → rewind timeline ready");

    expect(html).toContain("const runPaperSequence = async");
    expect(html).toContain("const startPaperPlayback = () =>");
    expect(html).toContain("const pausePaperPlayback = () =>");
    expect(html).toContain("if (paperPlaying) progress = Math.min(1");
    expect(html).toContain("paperPlay.addEventListener(\"click\", startPaperPlayback)");
    expect(html).toContain("paperPause.addEventListener(\"click\", pausePaperPlayback)");
    expect(html).toContain("paperPreviousStep.addEventListener(\"click\", () => movePaperFrame(-1))");
    expect(html).toContain("paperNextStep.addEventListener(\"click\", () => movePaperFrame(1))");
    expect(html).toContain('paperPhase.textContent = "Rewind"');

    expect(html).not.toContain('id="paper-mode-overview"');
    expect(html).not.toContain('id="paper-mode-steps"');
    expect(html).not.toContain('id="paper-mode-animation"');
  });
});
