import { readFile } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import path from "node:path";
import type { ViewerPayload } from "./viewer-payload.js";

const escapedPayloadJson = (payloads: readonly ViewerPayload[]): string => JSON.stringify(payloads)
  .replaceAll("&", "\\u0026")
  .replaceAll("<", "\\u003c")
  .replaceAll(">", "\\u003e");

export const renderViewerHtml = (
  payloads: readonly ViewerPayload[],
): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>ManipAT Interactive Viewer</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#20242a;background:#f5f6f8}*{box-sizing:border-box}body{margin:0;min-height:100vh}.shell{display:grid;grid-template-rows:auto auto 1fr auto;min-height:100vh}.bar{display:flex;gap:.55rem;align-items:center;flex-wrap:wrap;padding:.7rem .9rem;background:#fff;border-bottom:1px solid #d9dde3}.bar.secondary{border-top:1px solid #d9dde3;border-bottom:0}.heading{margin-right:auto;min-width:15rem}.title{font-weight:650}.meta{font-size:.8rem;color:#636b74}.controls,.navigator{display:flex;gap:.35rem;align-items:center;flex-wrap:wrap}.controls button,.action,.toggle,.navigator button,.navigator select,.paper-nav button{font:inherit;font-size:.82rem;border:1px solid #c8cdd3;border-radius:.5rem;background:#fff;padding:.42rem .62rem;color:#20242a}.controls button:hover,.action:hover,.navigator button:hover,.paper-nav button:hover{background:#f0f2f4}.navigator select{max-width:21rem}.navigator .question{max-width:28rem}.toggle{display:flex;gap:.35rem;align-items:center}.viewer{position:relative;min-height:420px;background:#f8f9fa}.canvas{position:absolute;inset:0}.hint{position:absolute;left:.75rem;bottom:.75rem;background:rgba(255,255,255,.9);padding:.4rem .55rem;border-radius:.4rem;font-size:.75rem;color:#59616a;pointer-events:none}.status{font-size:.78rem;color:#59616a;margin-left:auto}.hidden{display:none!important}.paper-guide{position:absolute;inset:0;display:grid;grid-template-rows:auto 1fr auto;gap:.8rem;padding:.8rem;overflow:auto;background:#f8f9fa}.paper-sequence{display:flex;gap:.6rem;overflow-x:auto;padding:.15rem .1rem .45rem}.paper-sequence-item{flex:0 0 112px;background:#fff;border:1px solid #dde1e6;border-radius:.55rem;padding:.35rem;box-shadow:0 1px 2px rgba(0,0,0,.03)}.paper-sequence-item svg{width:100%;height:auto;display:block}.paper-sequence-label{text-align:center;font-size:.72rem;color:#636b74;margin-top:.2rem}.paper-main{display:grid;grid-template-columns:minmax(260px,560px) minmax(220px,330px);gap:1rem;align-items:center;justify-content:center;min-height:0}.paper-svg{display:flex;align-items:center;justify-content:center;min-height:280px}.paper-svg svg{width:min(70vw,520px);max-height:58vh;height:auto;display:block}.paper-card{background:#fff;border:1px solid #dde1e6;border-radius:.7rem;padding:.85rem;box-shadow:0 1px 2px rgba(0,0,0,.03)}.paper-step-title{font-weight:650;margin-bottom:.45rem}.paper-detail{font-size:.88rem;line-height:1.45;color:#3e4650}.paper-stats{font-size:.8rem;line-height:1.5;color:#636b74;margin-top:.7rem;padding-top:.6rem;border-top:1px solid #eceff2}.paper-legend{font-size:.75rem;color:#636b74;margin-top:.65rem}.paper-legend span{display:inline-flex;align-items:center;gap:.25rem;margin-right:.6rem}.dot{width:.62rem;height:.62rem;border-radius:50%;display:inline-block}.dot.old{background:#20242a}.dot.new{background:#c85f4b}.dot.prior{background:#fff;border:1px dashed #8a929b}.paper-nav{display:flex;gap:.55rem;align-items:center;justify-content:center;padding:.2rem}.paper-progress{min-width:7rem;text-align:center;font-size:.82rem;color:#59616a}@media(max-width:760px){.shell{grid-template-rows:auto auto minmax(62vh,1fr) auto}.heading{width:100%;min-width:0;margin:0}.navigator{width:100%}.navigator select{max-width:100%;flex:1}.navigator .question{max-width:100%;width:100%;order:3;flex-basis:100%}.controls button,.action,.toggle,.navigator button,.navigator select,.paper-nav button{font-size:.78rem;padding:.4rem .5rem}.paper-main{grid-template-columns:1fr;align-items:start}.paper-svg svg{width:min(92vw,480px);max-height:none}.paper-card{max-width:520px;width:100%;margin:0 auto}.paper-sequence-item{flex-basis:94px}}
</style>
<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script>
</head>
<body>
<div class="shell">
  <header class="bar">
    <div class="heading"><div class="title" id="title">ManipAT Interactive Viewer</div><div class="meta" id="meta"></div></div>
    <div class="controls" id="view-controls"></div>
    <button id="target" class="action hidden">Target view</button>
    <button id="reset" class="action">Reset</button>
  </header>
  <nav class="bar navigator" aria-label="Question navigation">
    <select id="category" aria-label="Category filter"><option value="all">All interactive categories</option></select>
    <button id="previous" type="button">← Previous</button>
    <button id="next" type="button">Next →</button>
    <select id="question" class="question" aria-label="Question"></select>
    <span id="position" class="meta"></span>
  </nav>
  <main class="viewer">
    <div id="canvas" class="canvas" aria-label="Interactive Three.js PAT visualization"></div>
    <section id="paper-guide" class="paper-guide hidden" aria-label="Paper punching guided explanation">
      <div id="paper-sequence" class="paper-sequence"></div>
      <div class="paper-main">
        <div id="paper-svg" class="paper-svg"></div>
        <aside class="paper-card">
          <div id="paper-step-title" class="paper-step-title"></div>
          <div id="paper-detail" class="paper-detail"></div>
          <div id="paper-stats" class="paper-stats"></div>
          <div class="paper-legend"><span><i class="dot old"></i>existing</span><span><i class="dot new"></i>new after unfold</span><span><i class="dot prior"></i>prior stacked position</span></div>
        </aside>
      </div>
      <div class="paper-nav">
        <button id="paper-previous" type="button">← Previous step</button>
        <span id="paper-progress" class="paper-progress"></span>
        <button id="paper-next" type="button">Next step →</button>
      </div>
    </section>
    <div id="hint" class="hint">Drag to rotate · wheel/pinch to zoom · right-drag/two-finger drag to pan</div>
  </main>
  <footer class="bar secondary">
    <div class="controls" id="runtime-controls">
      <label class="toggle"><input id="auto" type="checkbox"> Auto rotate</label>
      <label class="toggle" id="ghost-wrap"><input id="ghost" type="checkbox"> Ghost / hidden lines</label>
      <label class="toggle"><input id="surface" type="checkbox" checked> Surface</label>
      <label class="toggle" id="edges-wrap"><input id="edges" type="checkbox" checked> Edges</label>
      <label class="toggle" id="explain-wrap"><input id="explain" type="checkbox"> Show explanation</label>
    </div>
    <div id="status" class="status">Initializing viewer…</div>
  </footer>
</div>
<script id="payloads" type="application/json">${escapedPayloadJson(payloads)}</script>
<script type="module">
import { createQuestionRuntimeViewer } from "/runtime/index.js";
const payloads = JSON.parse(document.getElementById("payloads").textContent);
const labels = { "isometric":"3D", "front":"Front", "top":"Top", "right-end":"End" };
const categoryLabels = { aperture:"Aperture", "view-recognition":"TFE", "paper-folding":"Paper Punching", "cube-counting":"Cube Counting", "form-development":"Form Development" };
const canvas = document.getElementById("canvas");
const paperGuide = document.getElementById("paper-guide");
const paperSequence = document.getElementById("paper-sequence");
const paperSvg = document.getElementById("paper-svg");
const paperStepTitle = document.getElementById("paper-step-title");
const paperDetail = document.getElementById("paper-detail");
const paperStats = document.getElementById("paper-stats");
const paperPrevious = document.getElementById("paper-previous");
const paperNext = document.getElementById("paper-next");
const paperProgress = document.getElementById("paper-progress");
const hint = document.getElementById("hint");
const title = document.getElementById("title");
const meta = document.getElementById("meta");
const status = document.getElementById("status");
const viewControls = document.getElementById("view-controls");
const runtimeControls = document.getElementById("runtime-controls");
const target = document.getElementById("target");
const reset = document.getElementById("reset");
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
let paperPayload;
let paperStep = 0;
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

const pointKey = (point) => Number(point[0]).toFixed(6) + "," + Number(point[1]).toFixed(6);
const circleSvg = (point, fill, stroke, extra) => '<circle cx="' + Number(point[0]).toFixed(4) + '" cy="' + Number(point[1]).toFixed(4) + '" r="0.17" fill="' + fill + '" stroke="' + stroke + '" stroke-width="0.055" ' + (extra ?? "") + '/>';
const blankSheetSvg = () => {
  let grid = "";
  for (let index = 1; index < 4; index += 1) {
    grid += '<line x1="' + String(index) + '" y1="0" x2="' + String(index) + '" y2="4" stroke="#d5d9de" stroke-width="0.035"/>';
    grid += '<line x1="0" y1="' + String(index) + '" x2="4" y2="' + String(index) + '" stroke="#d5d9de" stroke-width="0.035"/>';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.2 -0.2 4.4 4.4"><rect x="0" y="0" width="4" height="4" fill="white" stroke="black" stroke-width="0.08"/>' + grid + '</svg>';
};

const paperSvgWithOverlays = (step) => {
  let base = step.baseSvg ?? blankSheetSvg();
  let overlays = "";
  if (step.foldLine !== undefined) {
    const point = step.foldLine.point;
    const direction = step.foldLine.unitDirection;
    const scale = 8;
    overlays += '<line x1="' + String(point[0] - direction[0] * scale) + '" y1="' + String(point[1] - direction[1] * scale) + '" x2="' + String(point[0] + direction[0] * scale) + '" y2="' + String(point[1] + direction[1] * scale) + '" stroke="#537fa6" stroke-width="0.055" stroke-dasharray="0.18 0.12" opacity="0.9"/>';
  }
  for (const point of step.departedHoles) {
    overlays += circleSvg(point, "none", "#8a929b", 'stroke-dasharray="0.09 0.07" opacity="0.85"');
  }
  const newKeys = new Set(step.newHoles.map(pointKey));
  for (const point of step.holes) {
    const isNew = newKeys.has(pointKey(point));
    overlays += circleSvg(point, isNew ? "#c85f4b" : "#20242a", isNew ? "#9f4536" : "#20242a", "");
  }
  return base.replace(/<\/svg>\s*$/i, overlays + "</svg>");
};

const renderPaperStep = () => {
  if (paperPayload === undefined) return;
  const step = paperPayload.steps[paperStep];
  if (step === undefined) return;
  paperSvg.innerHTML = paperSvgWithOverlays(step);
  paperStepTitle.textContent = step.title;
  if (step.kind === "punch") {
    const punchSummary = paperPayload.punches.map((punch, index) => "Punch " + String(index + 1) + ": " + String(punch.layerCount) + " layer" + (punch.layerCount === 1 ? "" : "s")).join(" · ");
    paperDetail.textContent = "Start from the punched folded stack. Each punch pierces every paper layer directly underneath it. " + punchSummary + ".";
  } else {
    let detail = "Reverse this fold across the dashed axis. " + String(step.affectedLayerCount) + " punched layer" + (step.affectedLayerCount === 1 ? " moves" : "s move") + " with the flap.";
    if (step.newHoles.length > 0) detail += " This exposes " + String(step.newHoles.length) + " new hole position" + (step.newHoles.length === 1 ? "" : "s") + ", highlighted in coral.";
    if (step.departedHoles.length > 0) detail += " Dashed gray circles show the prior stacked position before that layer moved.";
    if (step.completedFoldCount === 0) detail += " The sheet is now fully unfolded; this is the solved hole pattern.";
    paperDetail.textContent = detail;
  }
  paperStats.textContent = "Visible hole positions: " + String(step.holes.length) + " · Folds still applied: " + String(step.completedFoldCount);
  paperProgress.textContent = "Step " + String(paperStep + 1) + " / " + String(paperPayload.steps.length);
  paperPrevious.disabled = paperStep === 0;
  paperNext.disabled = paperStep === paperPayload.steps.length - 1;
};

const mountPaper = (payload) => {
  paperPayload = payload;
  paperStep = 0;
  canvas.classList.add("hidden");
  hint.classList.add("hidden");
  paperGuide.classList.remove("hidden");
  runtimeControls.classList.add("hidden");
  viewControls.classList.add("hidden");
  target.classList.add("hidden");
  paperSequence.replaceChildren();
  payload.questionSvgs.forEach((svg, index) => {
    const item = document.createElement("div");
    item.className = "paper-sequence-item";
    const picture = document.createElement("div");
    picture.innerHTML = svg;
    const label = document.createElement("div");
    label.className = "paper-sequence-label";
    label.textContent = index === payload.questionSvgs.length - 1 ? "Punch" : "Fold " + String(index + 1);
    item.append(picture, label);
    paperSequence.append(item);
  });
  renderPaperStep();
  status.textContent = "Guided reverse-unfold explanation ready";
  status.style.color = "";
};

const mountThree = (payload) => {
  paperPayload = undefined;
  paperGuide.classList.add("hidden");
  canvas.classList.remove("hidden");
  hint.classList.remove("hidden");
  runtimeControls.classList.remove("hidden");
  viewControls.classList.remove("hidden");
  viewer = createQuestionRuntimeViewer(canvas, payload, { background: 0xf8f9fa });
  for (const preset of payload.cameraPresets) {
    const button = document.createElement("button");
    button.textContent = labels[preset] ?? preset;
    button.addEventListener("click", () => viewer.setViewPreset(preset));
    viewControls.append(button);
  }
  target.classList.toggle("hidden", !viewer.capabilities.targetView);
  ghostWrap.classList.toggle("hidden", !viewer.capabilities.ghost);
  edgesWrap.classList.toggle("hidden", !viewer.capabilities.edges);
  explainWrap.classList.toggle("hidden", !viewer.capabilities.explanation);
  viewer.setViewPreset("isometric");
  status.textContent = "Interactive 3D runtime ready";
  status.style.color = "";
};

const mountPosition = (requestedPosition) => {
  if (filteredIndices.length === 0) return;
  activePosition = Math.min(filteredIndices.length - 1, Math.max(0, requestedPosition));
  const globalIndex = filteredIndices[activePosition];
  const payload = payloads[globalIndex];
  if (viewer !== undefined) viewer.dispose();
  viewer = undefined;
  paperPayload = undefined;
  canvas.replaceChildren();
  viewControls.replaceChildren();
  resetToggles();
  title.textContent = payload.title;
  meta.textContent = "Exam item " + String(globalIndex + 1) + " · " + (categoryLabels[payload.category] ?? payload.category) + " · " + payload.questionId;
  try {
    if (payload.kind === "paper-guide") mountPaper(payload);
    else mountThree(payload);
  } catch (error) {
    viewer = undefined;
    paperPayload = undefined;
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
reset.addEventListener("click", () => {
  if (paperPayload !== undefined) {
    paperStep = 0;
    renderPaperStep();
  } else {
    viewer?.reset();
  }
});
auto.addEventListener("change", () => viewer?.setAutoRotate(auto.checked));
ghost.addEventListener("change", () => viewer?.setGhosted(ghost.checked));
surface.addEventListener("change", () => viewer?.setSurfaceVisible(surface.checked));
edges.addEventListener("change", () => viewer?.setEdgesVisible(edges.checked));
explain.addEventListener("change", () => viewer?.setExplanationVisible(explain.checked));
paperPrevious.addEventListener("click", () => {
  if (paperPayload === undefined) return;
  paperStep = Math.max(0, paperStep - 1);
  renderPaperStep();
});
paperNext.addEventListener("click", () => {
  if (paperPayload === undefined) return;
  paperStep = Math.min(paperPayload.steps.length - 1, paperStep + 1);
  renderPaperStep();
});
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
  payloads: readonly ViewerPayload[],
  host: string,
  port: number,
): Promise<void> => {
  if (payloads.length === 0) throw new RangeError("Viewer requires at least one interactive question");
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
  process.stdout.write(`Interactive viewer: http://${host}:${port}/\n`);
  process.stdout.write(`Questions loaded: ${payloads.length}\n`);
  process.stdout.write("Use the browser category/question controls to navigate.\n");
  process.stdout.write("Press Ctrl+C to stop the local viewer.\n");
};
