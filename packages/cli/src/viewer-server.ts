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
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#20242a;background:#f5f6f8}*{box-sizing:border-box}body{margin:0;min-height:100vh}.shell{display:grid;grid-template-rows:auto auto 1fr auto;min-height:100vh}.bar{display:flex;gap:.55rem;align-items:center;flex-wrap:wrap;padding:.7rem .9rem;background:#fff;border-bottom:1px solid #d9dde3}.bar.secondary{border-top:1px solid #d9dde3;border-bottom:0}.heading{margin-right:auto;min-width:15rem}.title{font-weight:650}.meta{font-size:.8rem;color:#636b74}.controls,.navigator{display:flex;gap:.35rem;align-items:center;flex-wrap:wrap}.controls button,.action,.toggle,.navigator button,.navigator select,.paper-controls button,.paper-controls select{font:inherit;font-size:.82rem;border:1px solid #c8cdd3;border-radius:.5rem;background:#fff;padding:.42rem .62rem;color:#20242a}.controls button:hover,.action:hover,.navigator button:hover,.paper-controls button:hover{background:#f0f2f4}.navigator select{max-width:21rem}.navigator .question{max-width:28rem}.toggle{display:flex;gap:.35rem;align-items:center}.viewer{position:relative;min-height:420px;background:#f8f9fa}.canvas{position:absolute;inset:0}.hint{position:absolute;left:.75rem;bottom:.75rem;background:rgba(255,255,255,.9);padding:.4rem .55rem;border-radius:.4rem;font-size:.75rem;color:#59616a;pointer-events:none}.status{font-size:.78rem;color:#59616a;margin-left:auto}.hidden{display:none!important}.color-legend{position:absolute;right:.75rem;top:.75rem;z-index:3;background:rgba(255,255,255,.94);border:1px solid #d8dde3;border-radius:.55rem;padding:.55rem .65rem;box-shadow:0 1px 4px rgba(0,0,0,.06);font-size:.72rem;color:#58616a;pointer-events:none}.color-legend-title{font-weight:650;color:#303842;margin-bottom:.3rem}.color-legend-row{display:flex;align-items:center;gap:.35rem;margin:.16rem 0}.swatch{width:.72rem;height:.72rem;border-radius:.2rem;border:1px solid rgba(32,36,42,.18)}.swatch.body{background:#d9dde3}.swatch.raised{background:#b9d7f0}.swatch.recess{background:#f0b7aa}.swatch.terminal{background:#f2d38b}.color-legend-note{max-width:15rem;margin-top:.35rem;line-height:1.25;color:#777f88}
.paper-guide{position:absolute;inset:0;display:grid;grid-template-columns:minmax(360px,1.08fr) minmax(360px,.92fr);gap:.9rem;padding:.8rem;overflow:auto;background:#f8f9fa}.paper-panel{background:#fff;border:1px solid #dde1e6;border-radius:.72rem;box-shadow:0 1px 2px rgba(0,0,0,.03);padding:.75rem;min-width:0}.paper-left{display:grid;grid-template-rows:auto 1fr;gap:.55rem}.paper-right{display:grid;grid-template-rows:auto minmax(300px,1fr) auto auto;gap:.65rem}.paper-panel-title{display:flex;justify-content:space-between;align-items:center;gap:.5rem;font-size:.9rem;font-weight:650;color:#303842}.paper-panel-subtitle{font-size:.72rem;font-weight:400;color:#737b84}.paper-overview{display:flex;align-items:flex-start;justify-content:center;overflow:auto;min-height:0}.paper-overview svg{display:block;width:100%;height:auto;max-height:76vh}.paper-animation-view{display:flex;align-items:center;justify-content:center;min-height:300px;border:1px solid #eceff2;border-radius:.6rem;background:#fafbfc;padding:.5rem;overflow:hidden}.paper-animation-view svg{display:block;width:min(100%,560px);height:auto;max-height:55vh}.paper-controls{display:flex;gap:.4rem;align-items:center;justify-content:center;flex-wrap:wrap}.paper-controls label{display:flex;gap:.35rem;align-items:center;font-size:.78rem;color:#59616a}.paper-controls button:disabled{opacity:.45;cursor:not-allowed}.paper-progress{font-size:.78rem;color:#59616a;min-width:8.5rem;text-align:center}.paper-card{background:#fbfcfd;border:1px solid #eceff2;border-radius:.6rem;padding:.72rem}.paper-step-title{font-weight:650;margin-bottom:.4rem}.paper-detail{font-size:.84rem;line-height:1.42;color:#3e4650}.paper-stats{font-size:.77rem;line-height:1.45;color:#636b74;margin-top:.55rem;padding-top:.5rem;border-top:1px solid #eceff2}.paper-legend{font-size:.72rem;color:#636b74;margin-top:.5rem}.paper-legend span{display:inline-flex;align-items:center;gap:.24rem;margin-right:.55rem}.dot{width:.6rem;height:.6rem;border-radius:50%;display:inline-block}.dot.old{background:#20242a}.dot.new{background:#c85f4b}.dot.prior{background:#fff;border:1px dashed #8a929b}.phase-badge{display:inline-flex;align-items:center;border-radius:999px;padding:.16rem .45rem;background:#edf1f5;color:#53606d;font-size:.7rem;font-weight:600}
@media(max-width:900px){.paper-guide{grid-template-columns:1fr}.paper-overview svg{max-height:none}.paper-animation-view svg{max-height:none}.paper-right{grid-template-rows:auto minmax(280px,auto) auto auto}}@media(max-width:760px){.shell{grid-template-rows:auto auto minmax(62vh,1fr) auto}.heading{width:100%;min-width:0;margin:0}.navigator{width:100%}.navigator select{max-width:100%;flex:1}.navigator .question{max-width:100%;width:100%;order:3;flex-basis:100%}.controls button,.action,.toggle,.navigator button,.navigator select,.paper-controls button,.paper-controls select{font-size:.78rem;padding:.4rem .5rem}.paper-guide{padding:.55rem;gap:.65rem}.paper-panel{padding:.6rem}.color-legend{right:.45rem;top:.45rem;max-width:12.5rem}}
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
    <div id="color-legend" class="color-legend hidden">
      <div class="color-legend-title">Color Code · learning cues</div>
      <div class="color-legend-row"><i class="swatch body"></i>Body / neutral surface</div>
      <div class="color-legend-row"><i class="swatch raised"></i>Raised feature (provenance-backed)</div>
      <div class="color-legend-row"><i class="swatch recess"></i>Hole / recess wall</div>
      <div class="color-legend-row"><i class="swatch terminal"></i>Likely blind-hole / recess floor</div>
      <div class="color-legend-note">Whole-surface learning cues only. Uncertain geometry stays neutral.</div>
    </div>
    <section id="paper-guide" class="paper-guide hidden" aria-label="Paper punching guided explanation">
      <section class="paper-panel paper-left" aria-label="All paper punching steps">
        <div class="paper-panel-title">All steps <span class="paper-panel-subtitle">Forward folds and reverse solution</span></div>
        <div id="paper-overview" class="paper-overview"></div>
      </section>
      <section class="paper-panel paper-right" aria-label="Interactive paper punching walkthrough">
        <div class="paper-panel-title">Interactive walkthrough <span id="paper-phase" class="phase-badge">Start</span></div>
        <div id="paper-animation-view" class="paper-animation-view"></div>
        <div class="paper-controls" aria-label="Paper animation controls">
          <button id="paper-previous-step" type="button">← Previous step</button>
          <button id="paper-next-step" type="button">Next step →</button>
          <button id="paper-play" type="button">▶ Play</button>
          <button id="paper-pause" type="button" disabled>Pause</button>
          <label>Speed
            <select id="paper-speed" aria-label="Paper animation speed">
              <option value="0.5">0.5×</option>
              <option value="1" selected>1×</option>
              <option value="1.5">1.5×</option>
              <option value="2">2×</option>
            </select>
          </label>
          <span id="paper-progress" class="paper-progress"></span>
        </div>
        <aside class="paper-card">
          <div id="paper-step-title" class="paper-step-title"></div>
          <div id="paper-detail" class="paper-detail"></div>
          <div id="paper-stats" class="paper-stats"></div>
          <div class="paper-legend"><span><i class="dot old"></i>existing</span><span><i class="dot new"></i>new after unfold</span><span><i class="dot prior"></i>prior stacked position</span></div>
        </aside>
      </section>
    </section>
    <div id="hint" class="hint">Drag to rotate · wheel/pinch to zoom · right-drag/two-finger drag to pan</div>
  </main>
  <footer class="bar secondary">
    <div class="controls" id="runtime-controls">
      <label class="toggle"><input id="auto" type="checkbox"> Auto rotate</label>
      <label class="toggle" id="color-wrap"><input id="color-code" type="checkbox"> Color Code</label>
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
const colorLegend = document.getElementById("color-legend");
const paperGuide = document.getElementById("paper-guide");
const paperOverview = document.getElementById("paper-overview");
const paperAnimationView = document.getElementById("paper-animation-view");
const paperPhase = document.getElementById("paper-phase");
const paperPreviousStep = document.getElementById("paper-previous-step");
const paperNextStep = document.getElementById("paper-next-step");
const paperPlay = document.getElementById("paper-play");
const paperPause = document.getElementById("paper-pause");
const paperSpeed = document.getElementById("paper-speed");
const paperProgress = document.getElementById("paper-progress");
const paperStepTitle = document.getElementById("paper-step-title");
const paperDetail = document.getElementById("paper-detail");
const paperStats = document.getElementById("paper-stats");
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
const colorCode = document.getElementById("color-code");
const ghost = document.getElementById("ghost");
const surface = document.getElementById("surface");
const edges = document.getElementById("edges");
const explain = document.getElementById("explain");
const colorWrap = document.getElementById("color-wrap");
const ghostWrap = document.getElementById("ghost-wrap");
const edgesWrap = document.getElementById("edges-wrap");
const explainWrap = document.getElementById("explain-wrap");

let viewer;
let paperPayload;
let paperFrames = [];
let paperFrameIndex = 0;
let paperPlaybackToken = 0;
let paperPlaybackActive = false;
let paperPlaying = false;
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
  colorCode.checked = false;
  ghost.checked = false;
  surface.checked = true;
  edges.checked = true;
  explain.checked = false;
  colorLegend.classList.add("hidden");
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
  const base = step.baseSvg ?? blankSheetSvg();
  let overlays = "";
  if (step.foldLine !== undefined) {
    const point = step.foldLine.point;
    const direction = step.foldLine.unitDirection;
    const scale = 8;
    overlays += '<line x1="' + String(point[0] - direction[0] * scale) + '" y1="' + String(point[1] - direction[1] * scale) + '" x2="' + String(point[0] + direction[0] * scale) + '" y2="' + String(point[1] + direction[1] * scale) + '" stroke="#537fa6" stroke-width="0.055" stroke-dasharray="0.18 0.12" opacity="0.9"/>';
  }
  for (const point of step.departedHoles) overlays += circleSvg(point, "none", "#8a929b", 'stroke-dasharray="0.09 0.07" opacity="0.85"');
  const newKeys = new Set(step.newHoles.map(pointKey));
  for (const point of step.holes) {
    const isNew = newKeys.has(pointKey(point));
    overlays += circleSvg(point, isNew ? "#c85f4b" : "#20242a", isNew ? "#9f4536" : "#20242a", "");
  }
  const closing = base.lastIndexOf("</svg>");
  return closing >= 0 ? base.slice(0, closing) + overlays + "</svg>" : base;
};

const svgPolygonPoints = (polygon) => polygon.map((point) => Number(point[0]).toFixed(4) + "," + Number(point[1]).toFixed(4)).join(" ");
const foldAnimatedPoint = (point, line, progress) => {
  const dx = point[0] - line.point[0];
  const dy = point[1] - line.point[1];
  const projection = dx * line.unitDirection[0] + dy * line.unitDirection[1];
  const projectedX = line.point[0] + projection * line.unitDirection[0];
  const projectedY = line.point[1] + projection * line.unitDirection[1];
  const scale = Math.cos(Math.PI * progress);
  return [projectedX + (point[0] - projectedX) * scale, projectedY + (point[1] - projectedY) * scale];
};
const foldAnimationSvg = (animation, progress) => {
  let body = '<rect x="0" y="0" width="4" height="4" fill="none" stroke="#7c858f" stroke-width="0.055" stroke-dasharray="0.18 0.14"/>';
  for (const polygon of animation.stationaryPolygons) body += '<polygon points="' + svgPolygonPoints(polygon) + '" fill="#fff" stroke="#20242a" stroke-width="0.075" stroke-linejoin="round"/>';
  for (const polygon of animation.movingPolygons) {
    const transformed = polygon.map((point) => foldAnimatedPoint(point, animation.line, progress));
    body += '<polygon points="' + svgPolygonPoints(transformed) + '" fill="#dceaf5" stroke="#365d7d" stroke-width="0.08" stroke-linejoin="round"/>';
  }
  const point = animation.line.point;
  const direction = animation.line.unitDirection;
  const scale = 8;
  body += '<line x1="' + String(point[0] - direction[0] * scale) + '" y1="' + String(point[1] - direction[1] * scale) + '" x2="' + String(point[0] + direction[0] * scale) + '" y2="' + String(point[1] + direction[1] * scale) + '" stroke="#537fa6" stroke-width="0.05" stroke-dasharray="0.16 0.11"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.2 -0.2 4.4 4.4">' + body + '</svg>';
};

const punchDetail = (payload) => payload.punches.map((punch, index) => "Punch " + String(index + 1) + ": " + String(punch.layerCount) + " layer" + (punch.layerCount === 1 ? "" : "s")).join(" · ");

const buildPaperFrames = (payload) => {
  const frames = [{
    phase: "Start",
    title: "Original sheet",
    svg: blankSheetSvg(),
    detail: "Begin with the original sheet before the first fold.",
    stats: "Forward sequence ready · " + String(payload.foldAnimations.length) + " fold" + (payload.foldAnimations.length === 1 ? "" : "s"),
    transition: undefined,
  }];
  const foldCount = Math.max(0, payload.questionSvgs.length - 1);
  for (let index = 0; index < foldCount; index += 1) {
    frames.push({
      phase: "Forward",
      title: "Fold " + String(index + 1),
      svg: payload.questionSvgs[index] ?? blankSheetSvg(),
      detail: "Apply forward fold " + String(index + 1) + " of " + String(foldCount) + ".",
      stats: "Forward folding · " + String(foldCount - index - 1) + " fold" + (foldCount - index - 1 === 1 ? "" : "s") + " remaining before the punch",
      transition: payload.foldAnimations[index] === undefined ? undefined : { animationIndex: index, direction: 1 },
    });
  }
  const punchStep = payload.steps.find((step) => step.kind === "punch");
  const punchSvg = punchStep === undefined
    ? payload.questionSvgs.at(-1) ?? blankSheetSvg()
    : paperSvgWithOverlays(punchStep);
  frames.push({
    phase: "Punch",
    title: "Punched folded stack",
    svg: punchSvg,
    detail: "The sheet is fully folded and punched. " + punchDetail(payload) + ".",
    stats: "Forward folding complete · begin reversing the folds",
    transition: undefined,
  });
  const unfoldSteps = payload.steps.filter((step) => step.kind === "unfold");
  unfoldSteps.forEach((step, index) => {
    const animationIndex = payload.foldAnimations.length - 1 - index;
    let detail = "Reverse this fold across the dashed axis. " + String(step.affectedLayerCount) + " punched layer" + (step.affectedLayerCount === 1 ? " moves" : "s move") + " with the flap.";
    if (step.newHoles.length > 0) detail += " This exposes " + String(step.newHoles.length) + " new hole position" + (step.newHoles.length === 1 ? "" : "s") + ", highlighted in coral.";
    if (step.departedHoles.length > 0) detail += " Dashed gray circles show the prior stacked position before that layer moved.";
    if (step.completedFoldCount === 0) detail += " The sheet is now fully unfolded; this is the solved hole pattern.";
    frames.push({
      phase: step.completedFoldCount === 0 ? "Solved" : "Reverse",
      title: step.title,
      svg: paperSvgWithOverlays(step),
      detail,
      stats: "Visible hole positions: " + String(step.holes.length) + " · Folds still applied: " + String(step.completedFoldCount),
      transition: animationIndex < 0 || payload.foldAnimations[animationIndex] === undefined
        ? undefined
        : { animationIndex, direction: -1 },
    });
  });
  return frames;
};

const currentPaperSpeed = () => {
  const speed = Number(paperSpeed.value);
  return Number.isFinite(speed) && speed > 0 ? speed : 1;
};

const syncPaperPlaybackControls = () => {
  paperPlay.disabled = paperPlaybackActive && paperPlaying;
  paperPause.disabled = !paperPlaybackActive || !paperPlaying;
};

const renderPaperFrame = () => {
  const frame = paperFrames[paperFrameIndex];
  if (frame === undefined) return;
  paperAnimationView.innerHTML = frame.svg;
  paperPhase.textContent = frame.phase;
  paperStepTitle.textContent = frame.title;
  paperDetail.textContent = frame.detail;
  paperStats.textContent = frame.stats;
  paperProgress.textContent = "Step " + String(paperFrameIndex + 1) + " / " + String(paperFrames.length);
  paperPreviousStep.disabled = paperFrameIndex === 0;
  paperNextStep.disabled = paperFrameIndex === paperFrames.length - 1;
};

const cancelPaperPlayback = () => {
  paperPlaybackToken += 1;
  paperPlaybackActive = false;
  paperPlaying = false;
  syncPaperPlaybackControls();
};

const waitForPaperTime = (milliseconds, token) => new Promise((resolve) => {
  let elapsed = 0;
  let last = performance.now();
  const frame = (now) => {
    if (token !== paperPlaybackToken) { resolve(false); return; }
    if (paperPlaying) elapsed += (now - last) * currentPaperSpeed();
    last = now;
    if (elapsed >= milliseconds) resolve(true);
    else requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
});

const animatePaperTransition = (transition, reverse, token) => new Promise((resolve) => {
  if (paperPayload === undefined || transition === undefined) { resolve(true); return; }
  const animation = paperPayload.foldAnimations[transition.animationIndex];
  if (animation === undefined) { resolve(true); return; }
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const normalStart = transition.direction === 1 ? 0 : 1;
  const normalEnd = transition.direction === 1 ? 1 : 0;
  const start = reverse ? normalEnd : normalStart;
  const end = reverse ? normalStart : normalEnd;
  if (reducedMotion) {
    paperAnimationView.innerHTML = foldAnimationSvg(animation, end);
    resolve(true);
    return;
  }
  let progress = 0;
  let last = performance.now();
  const frame = (now) => {
    if (token !== paperPlaybackToken) { resolve(false); return; }
    if (paperPlaying) progress = Math.min(1, progress + (now - last) * currentPaperSpeed() / 780);
    last = now;
    const value = start + (end - start) * progress;
    paperAnimationView.innerHTML = foldAnimationSvg(animation, value);
    if (progress >= 1) resolve(true);
    else requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
});

const runPaperSequence = async (token) => {
  while (paperFrameIndex < paperFrames.length - 1) {
    const destination = paperFrames[paperFrameIndex + 1];
    paperPhase.textContent = destination?.phase ?? "Forward";
    const completed = await animatePaperTransition(destination?.transition, false, token);
    if (!completed || token !== paperPlaybackToken) return;
    paperFrameIndex += 1;
    renderPaperFrame();
    if (!await waitForPaperTime(220, token) || token !== paperPlaybackToken) return;
  }
  while (paperFrameIndex > 0) {
    paperPhase.textContent = "Rewind";
    const current = paperFrames[paperFrameIndex];
    const completed = await animatePaperTransition(current?.transition, true, token);
    if (!completed || token !== paperPlaybackToken) return;
    paperFrameIndex -= 1;
    renderPaperFrame();
    if (!await waitForPaperTime(120, token) || token !== paperPlaybackToken) return;
  }
};

const startPaperPlayback = () => {
  if (paperPayload === undefined || paperFrames.length === 0) return;
  if (paperPlaybackActive) {
    paperPlaying = true;
    syncPaperPlaybackControls();
    return;
  }
  paperPlaybackActive = true;
  paperPlaying = true;
  const token = ++paperPlaybackToken;
  syncPaperPlaybackControls();
  void runPaperSequence(token).finally(() => {
    if (token !== paperPlaybackToken) return;
    paperPlaybackActive = false;
    paperPlaying = false;
    syncPaperPlaybackControls();
    renderPaperFrame();
  });
};

const pausePaperPlayback = () => {
  if (!paperPlaybackActive) return;
  paperPlaying = false;
  syncPaperPlaybackControls();
};

const movePaperFrame = (delta) => {
  if (paperFrames.length === 0) return;
  cancelPaperPlayback();
  paperFrameIndex = Math.min(paperFrames.length - 1, Math.max(0, paperFrameIndex + delta));
  renderPaperFrame();
};

const mountPaper = (payload) => {
  cancelPaperPlayback();
  paperPayload = payload;
  paperFrames = buildPaperFrames(payload);
  paperFrameIndex = 0;
  canvas.classList.add("hidden");
  colorLegend.classList.add("hidden");
  hint.classList.add("hidden");
  paperGuide.classList.remove("hidden");
  runtimeControls.classList.add("hidden");
  viewControls.classList.add("hidden");
  target.classList.add("hidden");
  paperOverview.innerHTML = payload.overviewSvg;
  renderPaperFrame();
  status.textContent = "Paper overview and interactive forward → reverse → rewind timeline ready";
  status.style.color = "";
};

const mountThree = (payload) => {
  cancelPaperPlayback();
  paperPayload = undefined;
  paperFrames = [];
  paperGuide.classList.add("hidden");
  colorLegend.classList.add("hidden");
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
  colorWrap.classList.toggle("hidden", !viewer.capabilities.colorCode);
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
  cancelPaperPlayback();
  paperPayload = undefined;
  paperFrames = [];
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
    paperFrames = [];
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
    cancelPaperPlayback();
    paperFrameIndex = 0;
    renderPaperFrame();
  } else viewer?.reset();
});
auto.addEventListener("change", () => viewer?.setAutoRotate(auto.checked));
colorCode.addEventListener("change", () => {
  viewer?.setColorCoded(colorCode.checked);
  colorLegend.classList.toggle("hidden", !colorCode.checked);
});
ghost.addEventListener("change", () => viewer?.setGhosted(ghost.checked));
surface.addEventListener("change", () => viewer?.setSurfaceVisible(surface.checked));
edges.addEventListener("change", () => viewer?.setEdgesVisible(edges.checked));
explain.addEventListener("change", () => viewer?.setExplanationVisible(explain.checked));
paperPreviousStep.addEventListener("click", () => movePaperFrame(-1));
paperNextStep.addEventListener("click", () => movePaperFrame(1));
paperPlay.addEventListener("click", startPaperPlayback);
paperPause.addEventListener("click", pausePaperPlayback);
paperSpeed.addEventListener("change", () => {
  if (paperPlaybackActive && !paperPlaying) syncPaperPlaybackControls();
});
window.addEventListener("beforeunload", () => { cancelPaperPlayback(); viewer?.dispose(); }, { once: true });
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
          await serveFile(response, path.join(threeRoot, "examples/jsm"), pathname.slice("/vendor/three/addons/".length));
          return;
        }
        if (pathname.startsWith("/vendor/three/")) {
          await serveFile(response, path.join(threeRoot, "build"), pathname.slice("/vendor/three/".length));
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