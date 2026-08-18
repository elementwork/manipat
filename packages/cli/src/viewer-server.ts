import { readFile } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import path from "node:path";
import type { RuntimeVisualizationPayload } from "@manipat/renderer-three";

const escapedPayloadJson = (payloads: readonly RuntimeVisualizationPayload[]): string => JSON.stringify(payloads)
  .replaceAll("&", "\\u0026")
  .replaceAll("<", "\\u003c")
  .replaceAll(">", "\\u003e");

export const renderViewerHtml = (
  payloads: readonly RuntimeVisualizationPayload[],
): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>ManipAT Three.js Viewer</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#20242a;background:#f5f6f8}*{box-sizing:border-box}body{margin:0;min-height:100vh}.shell{display:grid;grid-template-rows:auto auto 1fr auto;min-height:100vh}.bar{display:flex;gap:.55rem;align-items:center;flex-wrap:wrap;padding:.7rem .9rem;background:#fff;border-bottom:1px solid #d9dde3}.bar.secondary{border-top:1px solid #d9dde3;border-bottom:0}.heading{margin-right:auto;min-width:15rem}.title{font-weight:650}.meta{font-size:.8rem;color:#636b74}.controls,.navigator{display:flex;gap:.35rem;align-items:center;flex-wrap:wrap}.controls button,.action,.toggle,.navigator button,.navigator select{font:inherit;font-size:.82rem;border:1px solid #c8cdd3;border-radius:.5rem;background:#fff;padding:.42rem .62rem;color:#20242a}.controls button:hover,.action:hover,.navigator button:hover{background:#f0f2f4}.navigator select{max-width:21rem}.navigator .question{max-width:28rem}.toggle{display:flex;gap:.35rem;align-items:center}.viewer{position:relative;min-height:420px;background:#f8f9fa}.canvas{position:absolute;inset:0}.hint{position:absolute;left:.75rem;bottom:.75rem;background:rgba(255,255,255,.9);padding:.4rem .55rem;border-radius:.4rem;font-size:.75rem;color:#59616a;pointer-events:none}.status{font-size:.78rem;color:#59616a;margin-left:auto}.hidden{display:none!important}@media(max-width:760px){.shell{grid-template-rows:auto auto minmax(62vh,1fr) auto}.heading{width:100%;min-width:0;margin:0}.navigator{width:100%}.navigator select{max-width:100%;flex:1}.navigator .question{max-width:100%;width:100%;order:3;flex-basis:100%}.controls button,.action,.toggle,.navigator button,.navigator select{font-size:.78rem;padding:.4rem .5rem}}
</style>
<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script>
</head>
<body>
<div class="shell">
  <header class="bar">
    <div class="heading"><div class="title" id="title">ManipAT Three.js Viewer</div><div class="meta" id="meta"></div></div>
    <div class="controls" id="view-controls"></div>
    <button id="target" class="action hidden">Target view</button>
    <button id="reset" class="action">Reset</button>
  </header>
  <nav class="bar navigator" aria-label="Question navigation">
    <select id="category" aria-label="Category filter"><option value="all">All 3D categories</option></select>
    <button id="previous" type="button">← Previous</button>
    <button id="next" type="button">Next →</button>
    <select id="question" class="question" aria-label="Question"></select>
    <span id="position" class="meta"></span>
  </nav>
  <main class="viewer">
    <div id="canvas" class="canvas" aria-label="Interactive Three.js PAT visualization"></div>
    <div class="hint">Drag to rotate · wheel/pinch to zoom · right-drag/two-finger drag to pan</div>
  </main>
  <footer class="bar secondary">
    <div class="controls">
      <label class="toggle"><input id="auto" type="checkbox"> Auto rotate</label>
      <label class="toggle" id="ghost-wrap"><input id="ghost" type="checkbox"> Ghost / hidden lines</label>
      <label class="toggle"><input id="surface" type="checkbox" checked> Surface</label>
      <label class="toggle" id="edges-wrap"><input id="edges" type="checkbox" checked> Edges</label>
      <label class="toggle" id="explain-wrap"><input id="explain" type="checkbox"> Show explanation</label>
    </div>
    <div id="status" class="status">Initializing WebGL…</div>
  </footer>
</div>
<script id="payloads" type="application/json">${escapedPayloadJson(payloads)}</script>
<script type="module">
import { createQuestionRuntimeViewer } from "/runtime/index.js";
const payloads = JSON.parse(document.getElementById("payloads").textContent);
const labels = { "isometric":"3D", "front":"Front", "top":"Top", "right-end":"End" };
const categoryLabels = { aperture:"Aperture", "view-recognition":"TFE", "cube-counting":"Cube Counting", "form-development":"Form Development" };
const canvas = document.getElementById("canvas");
const title = document.getElementById("title");
const meta = document.getElementById("meta");
const status = document.getElementById("status");
const viewControls = document.getElementById("view-controls");
const target = document.getElementById("target");
const categorySelect = document.getElementById("category");
const questionSelect = document.getElementById("question");
const previous = document.getElementById("previous");
const next = document.getElementById("next");
const position = document.getElementById("position");
const auto = document.getElementById("auto");
const ghost = document.getElementById("ghost");
const surface = document.getElementById("surface");
const edges = document.getElementById("edges");
const explain = document.getElementById("explain");
const ghostWrap = document.getElementById("ghost-wrap");
const edgesWrap = document.getElementById("edges-wrap");
const explainWrap = document.getElementById("explain-wrap");
let viewer;
let filteredIndices = [];
let activePosition = 0;

for (const category of [...new Set(payloads.map((payload) => payload.category))]) {
  const option = document.createElement("option");
  option.value = category;
  option.textContent = categoryLabels[category] ?? category;
  categorySelect.append(option);
}

const resetToggles = () => {
  auto.checked = false;
  ghost.checked = false;
  surface.checked = true;
  edges.checked = true;
  explain.checked = false;
};

const mountPosition = (requestedPosition) => {
  if (filteredIndices.length === 0) return;
  activePosition = Math.min(filteredIndices.length - 1, Math.max(0, requestedPosition));
  const globalIndex = filteredIndices[activePosition];
  const payload = payloads[globalIndex];
  if (viewer !== undefined) viewer.dispose();
  canvas.replaceChildren();
  viewControls.replaceChildren();
  resetToggles();
  try {
    viewer = createQuestionRuntimeViewer(canvas, payload, { background: 0xf8f9fa });
    for (const preset of payload.cameraPresets) {
      const button = document.createElement("button");
      button.textContent = labels[preset] ?? preset;
      button.addEventListener("click", () => viewer.setViewPreset(preset));
      viewControls.append(button);
    }
    title.textContent = payload.title;
    meta.textContent = "Exam item " + String(globalIndex + 1) + " · " + (categoryLabels[payload.category] ?? payload.category) + " · " + payload.questionId;
    target.classList.toggle("hidden", !viewer.capabilities.targetView);
    ghostWrap.classList.toggle("hidden", !viewer.capabilities.ghost);
    edgesWrap.classList.toggle("hidden", !viewer.capabilities.edges);
    explainWrap.classList.toggle("hidden", !viewer.capabilities.explanation);
    viewer.setViewPreset("isometric");
    status.textContent = "Interactive runtime ready";
    status.style.color = "";
  } catch (error) {
    viewer = undefined;
    status.textContent = error instanceof Error ? error.message : String(error);
    status.style.color = "#a22";
  }
  questionSelect.value = String(activePosition);
  position.textContent = String(activePosition + 1) + " / " + String(filteredIndices.length);
  previous.disabled = activePosition === 0;
  next.disabled = activePosition === filteredIndices.length - 1;
};

const rebuildQuestionList = (preferredGlobalIndex) => {
  const category = categorySelect.value;
  filteredIndices = payloads.flatMap((payload, index) =>
    category === "all" || payload.category === category ? [index] : []);
  questionSelect.replaceChildren();
  filteredIndices.forEach((globalIndex, localIndex) => {
    const payload = payloads[globalIndex];
    const option = document.createElement("option");
    option.value = String(localIndex);
    option.textContent = "#" + String(globalIndex + 1) + " · " + (categoryLabels[payload.category] ?? payload.category) + " · " + payload.questionId;
    questionSelect.append(option);
  });
  const preferredPosition = filteredIndices.indexOf(preferredGlobalIndex);
  mountPosition(preferredPosition >= 0 ? preferredPosition : 0);
};

categorySelect.addEventListener("change", () => {
  const currentGlobal = filteredIndices[activePosition] ?? 0;
  rebuildQuestionList(currentGlobal);
});
questionSelect.addEventListener("change", () => mountPosition(Number(questionSelect.value)));
previous.addEventListener("click", () => mountPosition(activePosition - 1));
next.addEventListener("click", () => mountPosition(activePosition + 1));
target.addEventListener("click", () => viewer?.setTargetView());
document.getElementById("reset").addEventListener("click", () => viewer?.reset());
auto.addEventListener("change", () => viewer?.setAutoRotate(auto.checked));
ghost.addEventListener("change", () => viewer?.setGhosted(ghost.checked));
surface.addEventListener("change", () => viewer?.setSurfaceVisible(surface.checked));
edges.addEventListener("change", () => viewer?.setEdgesVisible(edges.checked));
explain.addEventListener("change", () => viewer?.setExplanationVisible(explain.checked));
window.addEventListener("beforeunload", () => viewer?.dispose(), { once: true });
rebuildQuestionList(0);
</script>
</body>
</html>`;

const send = (response: ServerResponse, status: number, contentType: string, body: string | Buffer): void => {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(body);
};

const safeRelativePath = (value: string): string => {
  const decoded = decodeURIComponent(value);
  if (decoded.includes("\\") || decoded.split("/").some((part) => part === "..")) {
    throw new RangeError("Invalid asset path");
  }
  return decoded.replace(/^\/+/, "");
};

const serveFile = async (
  response: ServerResponse,
  root: string,
  relativePath: string,
): Promise<void> => {
  const safe = safeRelativePath(relativePath);
  const absoluteRoot = path.resolve(root);
  const filename = path.resolve(absoluteRoot, safe);
  if (filename !== absoluteRoot && !filename.startsWith(`${absoluteRoot}${path.sep}`)) {
    throw new RangeError("Asset path escaped its root");
  }
  const body = await readFile(filename);
  const contentType = filename.endsWith(".js") ? "text/javascript; charset=utf-8"
    : filename.endsWith(".map") ? "application/json; charset=utf-8"
      : "application/octet-stream";
  send(response, 200, contentType, body);
};

export const startViewerServer = async (
  payloads: readonly RuntimeVisualizationPayload[],
  host: string,
  port: number,
): Promise<void> => {
  if (payloads.length === 0) throw new RangeError("Viewer requires at least one 3D question");
  const runtimeRoot = path.resolve("packages/renderer-three/dist");
  const threeRoot = path.resolve("packages/renderer-three/node_modules/three");
  const html = renderViewerHtml(payloads);
  const server = createServer((request, response) => {
    void (async () => {
      try {
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
        if (pathname === "/") {
          send(response, 200, "text/html; charset=utf-8", html);
          return;
        }
        if (pathname === "/favicon.ico") {
          response.writeHead(204);
          response.end();
          return;
        }
        if (pathname.startsWith("/vendor/three/addons/")) {
          await serveFile(
            response,
            path.join(threeRoot, "examples/jsm"),
            pathname.slice("/vendor/three/addons/".length),
          );
          return;
        }
        if (pathname.startsWith("/vendor/three/")) {
          await serveFile(
            response,
            path.join(threeRoot, "build"),
            pathname.slice("/vendor/three/".length),
          );
          return;
        }
        if (pathname.startsWith("/runtime/")) {
          await serveFile(response, runtimeRoot, pathname.slice("/runtime/".length));
          return;
        }
        send(response, 404, "text/plain; charset=utf-8", "Not found");
      } catch (error) {
        send(response, 500, "text/plain; charset=utf-8", error instanceof Error ? error.message : String(error));
      }
    })();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });
  process.stdout.write(`Three.js viewer: http://${host}:${port}/\n`);
  process.stdout.write(`Questions loaded: ${payloads.length}\n`);
  process.stdout.write("Use the browser category/question controls to navigate.\n");
  process.stdout.write("Press Ctrl+C to stop the local viewer.\n");
};
