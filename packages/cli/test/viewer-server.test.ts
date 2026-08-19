import { describe, expect, it } from "vitest";
import { renderViewerHtml } from "../src/viewer-server.js";
import type { PaperGuidePayload } from "../src/viewer-payload.js";

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"></svg>';

const paperPayload: PaperGuidePayload = {
  kind: "paper-guide",
  questionId: "paper-layout-test",
  category: "paper-folding",
  title: "Paper layout test",
  overviewSvg: svg,
  questionSvgs: [svg, svg],
  correctSvg: svg,
  punches: [{ point: [1.5, 1.5], layerCount: 2 }],
  steps: [
    {
      kind: "punch",
      title: "Punch",
      completedFoldCount: 1,
      baseSvg: svg,
      holes: [[1.5, 1.5]],
      newHoles: [],
      departedHoles: [],
      affectedLayerCount: 0,
    },
    {
      kind: "unfold",
      title: "Reverse fold 1",
      completedFoldCount: 0,
      baseSvg: svg,
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
  it("renders Paper Punching as one split workspace with unified timeline controls", () => {
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
    expect(html).toContain("forward → reverse → rewind timeline ready");
    expect(html).toContain("const runPaperSequence = async");
    expect(html).toContain('paperPhase.textContent = "Rewind"');

    expect(html).not.toContain('id="paper-mode-overview"');
    expect(html).not.toContain('id="paper-mode-steps"');
    expect(html).not.toContain('id="paper-mode-animation"');
  });
});