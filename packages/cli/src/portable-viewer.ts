import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PatQuestionType } from "@manipat/core";
import { readPersistedQuestions, type AnyPatQuestion } from "@manipat/question-bank";
import type { ViewerPayload } from "./viewer-payload.js";
import { renderViewerHtml } from "./viewer-server.js";
import { buildVisualizationPayload, visualizableCategories } from "./visualize.js";

const PORTABLE_RUNTIME_SPECIFIER = "@manipat/runtime/question-viewer.js";
const PORTABLE_MODE_META = '<meta name="manipat-viewer-mode" content="portable">';

type EmbeddedScopeKind = "runtime" | "three-build" | "three-addons";

interface EmbeddedScope {
  readonly kind: EmbeddedScopeKind;
  readonly root: string;
}

interface EmbeddedModuleLocation {
  readonly filePath: string;
  readonly scope: EmbeddedScope;
  readonly preferredSpecifier: string;
}

interface PortableModuleGraph {
  readonly imports: Readonly<Record<string, string>>;
  readonly moduleCount: number;
}

export interface PortableViewerCommandOptions {
  readonly target: string;
  readonly output?: string;
  readonly questionId?: string;
  readonly category?: string;
}

export interface PortableViewerDocument {
  readonly html: string;
  readonly moduleCount: number;
}

export interface PortableViewerWriteResult {
  readonly outputPath: string;
  readonly bytes: number;
  readonly moduleCount: number;
}

const toPosix = (value: string): string => value.split(path.sep).join("/");

const ensureInside = (root: string, filename: string): void => {
  const relative = path.relative(root, filename);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) return;
  throw new RangeError(`Portable viewer module escaped its package root: ${filename}`);
};

const syntheticSpecifier = (scope: EmbeddedScope, filename: string): string => {
  ensureInside(scope.root, filename);
  const relative = toPosix(path.relative(scope.root, filename));
  switch (scope.kind) {
    case "runtime": return `@manipat/runtime/${relative}`;
    case "three-build": return `@manipat/three-build/${relative}`;
    case "three-addons": return `@manipat/three-addons/${relative}`;
    default: return scope.kind satisfies never;
  }
};

const collectModuleSpecifiers = (source: string): readonly string[] => {
  const found = new Set<string>();
  const collect = (pattern: RegExp): void => {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[2];
      if (specifier !== undefined) found.add(specifier);
    }
  };
  collect(/\bimport\s+[^;]*?\s+from\s*(["'])([^"']+)\1/gu);
  collect(/\bexport\s+(?:\*\s*(?:as\s+\w+\s*)?|\{[^}]*\})\s+from\s*(["'])([^"']+)\1/gu);
  collect(/\bimport\s*(["'])([^"']+)\1/gu);
  collect(/\bimport\s*\(\s*(["'])([^"']+)\1\s*\)/gu);
  return [...found];
};

const rewriteModuleSpecifiers = (
  source: string,
  replacements: ReadonlyMap<string, string>,
): string => {
  const replace = (pattern: RegExp, input: string): string => input.replace(
    pattern,
    (match: string, quote: string, specifier: string) => {
      const replacement = replacements.get(specifier);
      return replacement === undefined
        ? match
        : match.replace(`${quote}${specifier}${quote}`, `${quote}${replacement}${quote}`);
    },
  );
  let rewritten = replace(/\bimport\s+[^;]*?\s+from\s*(["'])([^"']+)\1/gu, source);
  rewritten = replace(/\bexport\s+(?:\*\s*(?:as\s+\w+\s*)?|\{[^}]*\})\s+from\s*(["'])([^"']+)\1/gu, rewritten);
  rewritten = replace(/\bimport\s*(["'])([^"']+)\1/gu, rewritten);
  rewritten = replace(/\bimport\s*\(\s*(["'])([^"']+)\1\s*\)/gu, rewritten);
  return rewritten.replace(/^\/\/# sourceMappingURL=.*$/gmu, "");
};

const javascriptDataUrl = (source: string): string =>
  `data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`;

const locateRuntimeRoots = (): {
  readonly runtime: EmbeddedScope;
  readonly threeBuild: EmbeddedScope;
  readonly threeAddons: EmbeddedScope;
  readonly threeModulePath: string;
} => {
  const rendererEntryUrl = import.meta.resolve("@manipat/renderer-three");
  if (!rendererEntryUrl.startsWith("file:")) {
    throw new Error(`Renderer entry is not a local file URL: ${rendererEntryUrl}`);
  }
  const rendererEntry = fileURLToPath(rendererEntryUrl);
  const runtimeRoot = path.dirname(rendererEntry);
  const rendererRoot = path.dirname(runtimeRoot);
  const threeRoot = path.join(rendererRoot, "node_modules", "three");
  return {
    runtime: { kind: "runtime", root: runtimeRoot },
    threeBuild: { kind: "three-build", root: path.join(threeRoot, "build") },
    threeAddons: { kind: "three-addons", root: path.join(threeRoot, "examples", "jsm") },
    threeModulePath: path.join(threeRoot, "build", "three.module.js"),
  };
};

const buildPortableModuleGraph = async (): Promise<PortableModuleGraph> => {
  const roots = locateRuntimeRoots();
  const imports = new Map<string, string>();
  const specifierByFile = new Map<string, string>();

  const resolveDependency = (
    current: EmbeddedModuleLocation,
    specifier: string,
  ): EmbeddedModuleLocation => {
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      const filePath = path.resolve(path.dirname(current.filePath), specifier);
      ensureInside(current.scope.root, filePath);
      return {
        filePath,
        scope: current.scope,
        preferredSpecifier: syntheticSpecifier(current.scope, filePath),
      };
    }
    if (specifier === "three") {
      return {
        filePath: roots.threeModulePath,
        scope: roots.threeBuild,
        preferredSpecifier: "three",
      };
    }
    if (specifier.startsWith("three/addons/")) {
      const relative = specifier.slice("three/addons/".length);
      const filePath = path.resolve(roots.threeAddons.root, relative);
      ensureInside(roots.threeAddons.root, filePath);
      return {
        filePath,
        scope: roots.threeAddons,
        preferredSpecifier: specifier,
      };
    }
    throw new RangeError(`Portable viewer cannot embed module specifier: ${specifier}`);
  };

  const visit = async (location: EmbeddedModuleLocation): Promise<string> => {
    const filename = path.resolve(location.filePath);
    const existing = specifierByFile.get(filename);
    if (existing !== undefined) return existing;

    specifierByFile.set(filename, location.preferredSpecifier);
    const source = await readFile(filename, "utf8");
    const replacements = new Map<string, string>();
    for (const dependency of collectModuleSpecifiers(source)) {
      const resolved = resolveDependency(location, dependency);
      replacements.set(dependency, await visit(resolved));
    }
    const rewritten = rewriteModuleSpecifiers(source, replacements);
    imports.set(location.preferredSpecifier, javascriptDataUrl(rewritten));
    return location.preferredSpecifier;
  };

  const runtimeEntry = path.join(roots.runtime.root, "question-viewer.js");
  await visit({
    filePath: runtimeEntry,
    scope: roots.runtime,
    preferredSpecifier: PORTABLE_RUNTIME_SPECIFIER,
  });

  const ordered = Object.fromEntries(
    [...imports.entries()].sort(([first], [second]) => first.localeCompare(second)),
  );
  return { imports: ordered, moduleCount: imports.size };
};

const escapedInlineJson = (value: unknown): string => JSON.stringify(value)
  .replaceAll("&", "\\u0026")
  .replaceAll("<", "\\u003c")
  .replaceAll(">", "\\u003e");

export const buildPortableViewerDocument = async (
  payloads: readonly ViewerPayload[],
): Promise<PortableViewerDocument> => {
  if (payloads.length === 0) throw new RangeError("Portable viewer requires at least one interactive question");
  const graph = await buildPortableModuleGraph();
  const importMap = `<script type="importmap">${escapedInlineJson({ imports: graph.imports })}</script>`;
  let html = renderViewerHtml(payloads);
  const importMapPattern = /<script type="importmap">[\s\S]*?<\/script>/u;
  if (!importMapPattern.test(html)) throw new Error("Viewer HTML import map marker is missing");
  html = html.replace(importMapPattern, importMap);

  const runtimeImport = 'from "/runtime/index.js";';
  if (!html.includes(runtimeImport)) throw new Error("Viewer HTML runtime import marker is missing");
  html = html.replace(runtimeImport, `from "${PORTABLE_RUNTIME_SPECIFIER}";`);
  html = html.replace(
    "<title>ManipAT Interactive Viewer</title>",
    `<title>ManipAT Portable Interactive Viewer</title>\n${PORTABLE_MODE_META}`,
  );
  html = html.replace(
    "<body>",
    "<body>\n<!-- ManipAT portable viewer: runtime dependencies are embedded; no local web server is required. -->",
  );
  return { html, moduleCount: graph.moduleCount };
};

export const defaultPortableViewerPath = (target: string): string => {
  const resolved = path.resolve(target);
  const extension = path.extname(resolved);
  const basename = path.basename(resolved, extension);
  return path.join(path.dirname(resolved), `${basename}.interactive.html`);
};

export const writePortableViewer = async (
  payloads: readonly ViewerPayload[],
  output: string,
): Promise<PortableViewerWriteResult> => {
  const outputPath = path.resolve(output);
  const document = await buildPortableViewerDocument(payloads);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, document.html, "utf8");
  return {
    outputPath,
    bytes: Buffer.byteLength(document.html, "utf8"),
    moduleCount: document.moduleCount,
  };
};

const categoryFromText = (value: string): PatQuestionType => {
  const aliases: Readonly<Record<string, PatQuestionType>> = {
    aperture: "aperture",
    keyhole: "aperture",
    "view-recognition": "view-recognition",
    tfe: "view-recognition",
    "paper-folding": "paper-folding",
    paper: "paper-folding",
    "hole-punching": "paper-folding",
    "hole-punch": "paper-folding",
    "cube-counting": "cube-counting",
    cubes: "cube-counting",
    "form-development": "form-development",
    form: "form-development",
  };
  const resolved = aliases[value];
  if (resolved === undefined) {
    throw new RangeError(`Portable visualization supports: ${visualizableCategories().join(", ")}`);
  }
  return resolved;
};

const selectQuestions = (
  questions: readonly AnyPatQuestion[],
  questionId: string | undefined,
  categoryText: string | undefined,
): readonly AnyPatQuestion[] => {
  const supported = new Set<PatQuestionType>(visualizableCategories());
  if (questionId !== undefined) {
    const question = questions.find(({ id }) => id === questionId);
    if (question === undefined) throw new RangeError(`Question id not found: ${questionId}`);
    if (!supported.has(question.type)) {
      throw new RangeError(`${question.type} is not supported by the portable interactive viewer`);
    }
    return [question];
  }

  const requestedCategory = categoryText === undefined ? undefined : categoryFromText(categoryText);
  const selected = questions.filter((question) =>
    supported.has(question.type)
      && (requestedCategory === undefined || question.type === requestedCategory));
  if (selected.length === 0) {
    throw new RangeError(
      requestedCategory === undefined
        ? "Input contains no question available for portable interactive visualization"
        : `Input contains no ${requestedCategory} question available for portable interactive visualization`,
    );
  }
  return selected;
};

export const portableViewerCommand = async (
  options: PortableViewerCommandOptions,
): Promise<PortableViewerWriteResult> => {
  const questions = await readPersistedQuestions(path.resolve(options.target));
  const selected = selectQuestions(questions, options.questionId, options.category);
  const payloads: ViewerPayload[] = [];
  for (const question of selected) payloads.push(await buildVisualizationPayload(question));
  const output = options.output ?? defaultPortableViewerPath(options.target);
  const result = await writePortableViewer(payloads, output);
  process.stdout.write(`${result.outputPath}\n`);
  return result;
};
