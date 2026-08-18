import { readFile } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import path from "node:path";
import {
  canonicalStringify,
  createRandomSource,
  type JsonValue,
  type PatQuestionType,
  type Vec3,
} from "@manipat/core";
import { createManifoldKernel, normalizeSolid } from "@manipat/geometry";
import { getObjectTemplate } from "@manipat/object-generator";
import {
  PAT_CATEGORIES,
  readPersistedQuestions,
  type AnyPatQuestion,
} from "@manipat/question-bank";
import {
  indexedFacesToCanonicalMesh,
  serializeCanonicalMesh,
  type RuntimeViewPreset,
  type RuntimeVisualizationPayload,
} from "@manipat/renderer-three";

const VISUALIZABLE_CATEGORIES = [
  "aperture",
  "view-recognition",
  "cube-counting",
  "form-development",
] as const satisfies readonly PatQuestionType[];

type VisualizableCategory = typeof VISUALIZABLE_CATEGORIES[number];

export interface VisualizeCommandOptions {
  readonly target: string;
  readonly questionId?: string;
  readonly category?: string;
  readonly host?: string;
  readonly port?: string;
  readonly dryRun?: boolean;
}

const isVisualizableCategory = (type: PatQuestionType): type is VisualizableCategory =>
  (VISUALIZABLE_CATEGORIES as readonly PatQuestionType[]).includes(type);

const categoryFromText = (value: string): VisualizableCategory => {
  const aliases: Readonly<Record<string, VisualizableCategory>> = {
    aperture: "aperture",
    keyhole: "aperture",
    "view-recognition": "view-recognition",
    tfe: "view-recognition",
    "cube-counting": "cube-counting",
    cubes: "cube-counting",
    "form-development": "form-development",
    form: "form-development",
  };
  const resolved = aliases[value];
  if (resolved === undefined) {
    throw new RangeError(`Three.js visualization supports: ${VISUALIZABLE_CATEGORIES.join(", ")}`);
  }
  return resolved;
};

const reconstructTemplateMesh = async (question: AnyPatQuestion) => {
  const template = getObjectTemplate(question.templateId);
  if (!template.allowedQuestionTypes.includes(question.type)) {
    throw new Error(`Template ${template.id} is not registered for ${question.type}`);
  }
  const kernel = await createManifoldKernel();
  const generated = template.instantiate({
    kernel,
    seed: question.seed,
    random: createRandomSource(question.seed).fork("parameters"),
  });
  using source = generated.solid;
  const normalizedResult = normalizeSolid(kernel, source);
  using normalized = normalizedResult.solid;
  return kernel.getMesh(normalized);
};

const tfePreset = (view: "front" | "top" | "end"): RuntimeViewPreset =>
  view === "end" ? "right-end" : view;

const cubeKey = ([x, y, z]: Vec3): string => `${x},${y},${z}`;

export const buildVisualizationPayload = async (
  question: AnyPatQuestion,
): Promise<RuntimeVisualizationPayload> => {
  switch (question.type) {
    case "aperture": {
      const mesh = await reconstructTemplateMesh(question);
      return {
        kind: "mesh",
        questionId: question.id,
        category: question.type,
        title: "Aperture / Keyhole interactive object",
        cameraPresets: ["isometric", "front", "top", "right-end"],
        targetPreset: "top",
        targetRotationDegrees: question.prompt.orientationDegrees,
        mesh: serializeCanonicalMesh(mesh),
      };
    }
    case "view-recognition": {
      const mesh = await reconstructTemplateMesh(question);
      return {
        kind: "mesh",
        questionId: question.id,
        category: question.type,
        title: "TFE interactive source object",
        cameraPresets: ["isometric", "front", "top", "right-end"],
        targetPreset: tfePreset(question.prompt.missingView),
        mesh: serializeCanonicalMesh(mesh),
      };
    }
    case "cube-counting": {
      const positions: Vec3[] = question.prompt.figure.cubes.map(({ x, y, z }) => [x, y, z]);
      const matching = new Set(question.explanation.matchingCubes.map(({ x, y, z }) => cubeKey([x, y, z])));
      const highlightIndices = positions.flatMap((position, index) =>
        matching.has(cubeKey(position)) ? [index] : []);
      return {
        kind: "voxels",
        questionId: question.id,
        category: question.type,
        title: `Cube Counting — ${question.prompt.targetPaintedFaces} painted faces`,
        cameraPresets: ["isometric", "front", "top", "right-end"],
        positions,
        highlightIndices,
      };
    }
    case "form-development": {
      const mesh = indexedFacesToCanonicalMesh(
        question.prompt.polyhedron.vertices,
        question.prompt.polyhedron.faces,
      );
      return {
        kind: "mesh",
        questionId: question.id,
        category: question.type,
        title: "Form Development — folded solid explanation",
        cameraPresets: ["isometric", "front", "top", "right-end"],
        mesh: serializeCanonicalMesh(mesh),
        highlightFeatureIds: question.explanation.markedFaces,
      };
    }
    case "angle":
    case "paper-folding":
      throw new RangeError(
        `${question.type} is a 2D PAT category; use its canonical SVG rather than a Three.js reconstruction`,
      );
    default:
      return question satisfies never;
  }
};

const payloadSummary = (payload: RuntimeVisualizationPayload): JsonValue => payload.kind === "mesh"
  ? {
      questionId: payload.questionId,
      category: payload.category,
      kind: payload.kind,
      vertexCount: payload.mesh.vertexCount,
      triangleCount: payload.mesh.triangleCount,
      groupCount: payload.mesh.groups?.length ?? 0,
      targetView: payload.targetPreset ?? null,
    }
  : {
      questionId: payload.questionId,
      category: payload.category,
      kind: payload.kind,
      voxelCount: payload.positions.length,
      highlightCount: payload.highlightIndices?.length ?? 0,
      targetView: payload.targetPreset ?? null,
    };

const selectQuestion = (
  questions: readonly AnyPatQuestion[],
  questionId: string | undefined,
  categoryText: string | undefined,
): AnyPatQuestion => {
  if (questionId !== undefined) {
    const question = questions.find(({ id }) => id === questionId);
    if (question === undefined) throw new RangeError(`Question id not found: ${questionId}`);
    if (!isVisualizableCategory(question.type)) {
      throw new RangeError(`${question.type} is not a Three.js 3D category`);
    }
    return question;
  }
  const requestedCategory = categoryText === undefined ? undefined : categoryFromText(categoryText);
  const question = questions.find((candidate) =>
    isVisualizableCategory(candidate.type)
      && (requestedCategory === undefined || candidate.type === requestedCategory));
  if (question === undefined) {
    const requested = requestedCategory === undefined ? "a 3D question" : requestedCategory;
    throw new RangeError(`Input contains no ${requested} available for visualization`);
  }
  return question;
};

const escapedPayloadJson = (payload: RuntimeVisualizationPayload): string => JSON.stringify(payload)
  .replaceAll("&", "\\u0026")
  .replaceAll("<", "\\u003c")
  .replaceAll(">", "\\u003e");

const viewerHtml = (payload: RuntimeVisualizationPayload): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${payload.title.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#20242a;background:#f5f6f8}*{box-sizing:border-box}body{margin:0;min-height:100vh}.shell{display:grid;grid-template-rows:auto 1fr auto;min-height:100vh}.bar{display:flex;gap:.55rem;align-items:center;flex-wrap:wrap;padding:.7rem .9rem;background:#fff;border-bottom:1px solid #d9dde3}.bar.secondary{border-top:1px solid #d9dde3;border-bottom:0}.title{font-weight:650;margin-right:auto}.meta{font-size:.8rem;color:#636b74}.controls{display:flex;gap:.35rem;flex-wrap:wrap}.controls button,.toggle{font:inherit;font-size:.82rem;border:1px solid #c8cdd3;border-radius:.5rem;background:#fff;padding:.42rem .62rem;color:#20242a}.controls button:hover{background:#f0f2f4}.toggle{display:flex;gap:.35rem;align-items:center}.viewer{position:relative;min-height:420px;background:#f8f9fa}.canvas{position:absolute;inset:0}.hint{position:absolute;left:.75rem;bottom:.75rem;background:rgba(255,255,255,.88);padding:.4rem .55rem;border-radius:.4rem;font-size:.75rem;color:#59616a;pointer-events:none}.status{font-size:.78rem;color:#59616a}.hidden{display:none!important}@media(max-width:620px){.viewer{min-height:62vh}.title{width:100%;margin:0}.bar{align-items:flex-start}.controls button,.toggle{font-size:.78rem;padding:.4rem .5rem}}
</style>
<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script>
</head>
<body>
<div class="shell">
  <header class="bar">
    <div><div class="title">${payload.title}</div><div class="meta">${payload.questionId} · ${payload.category}</div></div>
    <div class="controls" id="view-controls"></div>
    <button id="target" class="hidden">Target view</button>
    <button id="reset">Reset</button>
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
const host = document.getElementById("canvas");
const status = document.getElementById("status");
try {
  const viewer = createQuestionRuntimeViewer(host, payload, { background: 0xf8f9fa });
  const viewControls = document.getElementById("view-controls");
  const labels = { "isometric":"3D", "front":"Front", "top":"Top", "right-end":"End" };
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
  const ghostWrap = document.getElementById("ghost-wrap");
  if (!viewer.capabilities.ghost) ghostWrap.classList.add("hidden");
  document.getElementById("ghost").addEventListener("change", (event) => viewer.setGhosted(event.target.checked));
  document.getElementById("surface").addEventListener("change", (event) => viewer.setSurfaceVisible(event.target.checked));
  const edgesWrap = document.getElementById("edges-wrap");
  if (!viewer.capabilities.edges) edgesWrap.classList.add("hidden");
  document.getElementById("edges").addEventListener("change", (event) => viewer.setEdgesVisible(event.target.checked));
  const explainWrap = document.getElementById("explain-wrap");
  if (!viewer.capabilities.explanation) explainWrap.classList.add("hidden");
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
  const filename = path.resolve(root, safe);
  const normalizedRoot = `${path.resolve(root)}${path.sep}`;
  if (filename !== path.resolve(root) && !filename.startsWith(normalizedRoot)) {
    throw new RangeError("Asset path escaped its root");
  }
  const body = await readFile(filename);
  const contentType = filename.endsWith(".js") ? "text/javascript; charset=utf-8"
    : filename.endsWith(".map") ? "application/json; charset=utf-8"
      : "application/octet-stream";
  send(response, 200, contentType, body);
};

const startViewerServer = async (
  payload: RuntimeVisualizationPayload,
  host: string,
  port: number,
): Promise<void> => {
  const runtimeRoot = path.resolve("packages/renderer-three/dist");
  const threeRoot = path.resolve("node_modules/three");
  const html = viewerHtml(payload);
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
          await serveFile(response, path.join(threeRoot, "examples/jsm"), pathname.slice("/vendor/three/addons/".length));
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

export const visualizeCommand = async (options: VisualizeCommandOptions): Promise<void> => {
  const questions = await readPersistedQuestions(path.resolve(options.target));
  const question = selectQuestion(questions, options.questionId, options.category);
  const payload = await buildVisualizationPayload(question);
  if (options.dryRun === true) {
    process.stdout.write(`${canonicalStringify(payloadSummary(payload))}\n`);
    return;
  }
  const host = options.host ?? "127.0.0.1";
  const port = Number(options.port ?? 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError("--port must be an integer from 1 to 65535");
  }
  await startViewerServer(payload, host, port);
};

export const visualizableCategories = (): readonly VisualizableCategory[] => VISUALIZABLE_CATEGORIES;
export const allPatCategories = (): readonly PatQuestionType[] => PAT_CATEGORIES;
