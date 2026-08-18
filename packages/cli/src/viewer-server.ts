import { readFile } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import path from "node:path";
import type { RuntimeVisualizationPayload } from "@manipat/renderer-three";

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const escapedPayloadJson = (payload: RuntimeVisualizationPayload): string => JSON.stringify(payload)
  .replaceAll("&", "\\u0026")
  .replaceAll("<", "\\u003c")
  .replaceAll(">", "\\u003e");

export const renderViewerHtml = (payload: RuntimeVisualizationPayload): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escapeHtml(payload.title)}</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#20242a;background:#f5f6f8}*{box-sizing:border-box}body{margin:0;min-height:100vh}.shell{display:grid;grid-template-rows:auto 1fr auto;min-height:100vh}.bar{display:flex;gap:.55rem;align-items:center;flex-wrap:wrap;padding:.7rem .9rem;background:#fff;border-bottom:1px solid #d9dde3}.bar.secondary{border-top:1px solid #d9dde3;border-bottom:0}.heading{margin-right:auto}.title{font-weight:650}.meta{font-size:.8rem;color:#636b74}.controls{display:flex;gap:.35rem;flex-wrap:wrap}.controls button,.action,.toggle{font:inherit;font-size:.82rem;border:1px solid #c8cdd3;border-radius:.5rem;background:#fff;padding:.42rem .62rem;color:#20242a}.controls button:hover,.action:hover{background:#f0f2f4}.toggle{display:flex;gap:.35rem;align-items:center}.viewer{position:relative;min-height:420px;background:#f8f9fa}.canvas{position:absolute;inset:0}.hint{position:absolute;left:.75rem;bottom:.75rem;background:rgba(255,255,255,.9);padding:.4rem .55rem;border-radius:.4rem;font-size:.75rem;color:#59616a;pointer-events:none}.status{font-size:.78rem;color:#59616a}.hidden{display:none!important}@media(max-width:620px){.viewer{min-height:62vh}.heading{width:100%;margin:0}.bar{align-items:flex-start}.controls button,.action,.toggle{font-size:.78rem;padding:.4rem .5rem}}
</style>
<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script>
</head>
<body>
<div class="shell">
  <header class="bar">
    <div class="heading"><div class="title">${escapeHtml(payload.title)}</div><div class="meta">${escapeHtml(payload.questionId)} · ${escapeHtml(payload.category)}</div></div>
    <div class="controls" id="view-controls"></div>
    <button id="target" class="action hidden">Target view</button>
    <button id="reset" class="action">Reset</button>
  </header>
  <main class="viewer">
    <div id="canvas" class="canvas" aria-label="Interactive Three.js PAT visualization"></div>
    <div class="hint">Drag to rotate · wheel/pinch to zoom · right-drag/two-finger drag to pan</div>
  </main>
  <footer class="bar secondary">
    <div class="controls">
      <label class="toggle"><input id="auto" type="checkbox"> Auto rotate</label>
      <label class="toggle" id="ghost-wrap"><input id="ghost" type="checkbox"> Ghost</label>
      <label class="toggle"><input id="surface" type="checkbox" checked> Surface</label>
      <label class="toggle" id="edges-wrap"><input id="edges" type="checkbox" checked> Edges</label>
      <label class="toggle" id="explain-wrap"><input id="explain" type="checkbox"> Show explanation</label>
    </div>
    <div id="status" class="status">Initializing WebGL…</div>
  </footer>
</div>
<script id="payload" type="application/json">${escapedPayloadJson(payload)}</script>
<script type="module">
import { createQuestionRuntimeViewer } from "/runtime/index.js";
const payload = JSON.parse(document.getElementById("payload").textContent);
const status = document.getElementById("status");
try {
  const viewer = createQuestionRuntimeViewer(document.getElementById("canvas"), payload, { background: 0xf8f9fa });
  const labels = { "isometric":"3D", "front":"Front", "top":"Top", "right-end":"End" };
  const viewControls = document.getElementById("view-controls");
  for (const preset of payload.cameraPresets) {
    const button = document.createElement("button");
    button.textContent = labels[preset] ?? preset;
    button.addEventListener("click", () => viewer.setViewPreset(preset));
    viewControls.append(button);
  }
  const target = document.getElementById("target");
  if (viewer.capabilities.targetView) target.classList.remove("hidden");
  target.addEventListener("click", () => viewer.setTargetView());
  document.getElementById("reset").addEventListener("click", () => viewer.reset());
  document.getElementById("auto").addEventListener("change", (event) => viewer.setAutoRotate(event.target.checked));
  if (!viewer.capabilities.ghost) document.getElementById("ghost-wrap").classList.add("hidden");
  document.getElementById("ghost").addEventListener("change", (event) => viewer.setGhosted(event.target.checked));
  document.getElementById("surface").addEventListener("change", (event) => viewer.setSurfaceVisible(event.target.checked));
  if (!viewer.capabilities.edges) document.getElementById("edges-wrap").classList.add("hidden");
  document.getElementById("edges").addEventListener("change", (event) => viewer.setEdgesVisible(event.target.checked));
  if (!viewer.capabilities.explanation) document.getElementById("explain-wrap").classList.add("hidden");
  document.getElementById("explain").addEventListener("change", (event) => viewer.setExplanationVisible(event.target.checked));
  viewer.setViewPreset("isometric");
  status.textContent = "Interactive runtime ready";
  window.addEventListener("beforeunload", () => viewer.dispose(), { once: true });
} catch (error) {
  status.textContent = error instanceof Error ? error.message : String(error);
  status.style.color = "#a22";
}
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
  payload: RuntimeVisualizationPayload,
  host: string,
  port: number,
): Promise<void> => {
  const runtimeRoot = path.resolve("packages/renderer-three/dist");
  const threeRoot = path.resolve("node_modules/three");
  const html = renderViewerHtml(payload);
  const server = createServer((request, response) => {
    void (async () => {
      try {
        const pathname = new URL(request.url ?? "/", `http://${host}:${port}`).pathname;
        if (pathname === "/") {
          send(response, 200, "text/html; charset=utf-8", html);
          return;
        }
        if (pathname === "/favicon.ico") {
          response.writeHead(204);
          response.end();
          return;
        }
        if (pathname === "/vendor/three/three.module.js") {
          await serveFile(response, path.join(threeRoot, "build"), "three.module.js");
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
  process.stdout.write(`Question: ${payload.questionId} (${payload.category})\n`);
  process.stdout.write("Press Ctrl+C to stop the local viewer.\n");
};
