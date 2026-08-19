import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPortableViewerDocument,
  defaultPortableViewerPath,
  writePortableViewer,
} from "../src/portable-viewer.js";
import type { PaperGuidePayload } from "../src/viewer-payload.js";

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"></svg>';

const paperPayload: PaperGuidePayload = {
  kind: "paper-guide",
  questionId: "paper-portable-test",
  category: "paper-folding",
  title: "Paper portable test",
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

const importMapFromHtml = (html: string): Readonly<Record<string, string>> => {
  const match = /<script type="importmap">([^<]+)<\/script>/u.exec(html);
  if (match?.[1] === undefined) throw new Error("Portable HTML import map missing");
  const parsed = JSON.parse(match[1]) as { readonly imports?: Readonly<Record<string, string>> };
  if (parsed.imports === undefined) throw new Error("Portable HTML imports map missing");
  return parsed.imports;
};

const decodedModule = (dataUrl: string): string => {
  const prefix = "data:text/javascript;base64,";
  if (!dataUrl.startsWith(prefix)) throw new Error(`Not an embedded JavaScript URL: ${dataUrl}`);
  return Buffer.from(dataUrl.slice(prefix.length), "base64").toString("utf8");
};

describe("portable interactive viewer", () => {
  it("embeds a closed Three.js/runtime module graph without local file fetches", async () => {
    const document = await buildPortableViewerDocument([paperPayload]);
    const imports = importMapFromHtml(document.html);

    expect(document.moduleCount).toBeGreaterThan(5);
    expect(imports["@manipat/runtime/question-viewer.js"]).toMatch(/^data:text\/javascript;base64,/u);
    expect(imports.three).toMatch(/^data:text\/javascript;base64,/u);
    expect(imports["three/addons/controls/OrbitControls.js"]).toMatch(/^data:text\/javascript;base64,/u);
    expect(document.html).toContain('<meta name="manipat-viewer-mode" content="portable">');
    expect(document.html).toContain("runtime dependencies are embedded; no local web server is required");
    expect(document.html).not.toContain('from "/runtime/index.js"');
    expect(document.html).not.toContain('"/vendor/three/three.module.js"');
    expect(document.html).not.toContain('"/vendor/three/addons/"');

    for (const dataUrl of Object.values(imports)) {
      expect(dataUrl).toMatch(/^data:text\/javascript;base64,/u);
      const source = decodedModule(dataUrl);
      expect(source).not.toMatch(/\bimport\s+[^;]*?\s+from\s*["']\.\.?\//u);
      expect(source).not.toMatch(/\bexport\s+(?:\*|\{[^}]*\})[^;]*?from\s*["']\.\.?\//u);
      expect(source).not.toMatch(/\bimport\s*["']\.\.?\//u);
    }
  });

  it("writes a standalone sibling HTML path", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "manipat-portable-"));
    const source = path.join(directory, "exam.html");
    const expected = path.join(directory, "exam.interactive.html");
    expect(defaultPortableViewerPath(source)).toBe(expected);

    const result = await writePortableViewer([paperPayload], expected);
    expect(result.outputPath).toBe(expected);
    expect(result.bytes).toBeGreaterThan(100_000);
    expect(result.moduleCount).toBeGreaterThan(5);
    const html = await readFile(expected, "utf8");
    expect(html).toContain("ManipAT Portable Interactive Viewer");
    expect(html).toContain("paper-portable-test");
  });
});
