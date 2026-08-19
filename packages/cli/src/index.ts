#!/usr/bin/env node
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { canonicalStringify, createRandomSource, type JsonValue, type PatQuestionType } from "@manipat/core";
import { createManifoldKernel } from "@manipat/geometry";
import {
  ConfigurationError,
  GenerationTargetError,
  PAT_CATEGORIES,
  augmentExamHtmlWithSolutions,
  createPatEngine,
  extractQuestionAssets,
  generateBatch,
  generateBatchWithWorkers,
  readPersistedQuestions,
  renderExamHtml,
  serializeQuestion,
  type AnyPatQuestion,
  type BatchConfig,
  type BatchResult,
  type DifficultyBand,
  type DifficultyMix,
  type DifficultyRequest,
  type ExamSolutionMode,
} from "@manipat/question-bank";
import { createVoxelInstancedRender } from "@manipat/renderer-three";

const CLI_VERSION = "0.1.0";
const EXIT = { success: 0, arguments: 1, config: 2, runtime: 3, target: 4, validation: 5, output: 6, determinism: 7 } as const;
const DIFFICULTY_NAMES: Readonly<Record<string, DifficultyBand>> = {
  beginner: 1, easy: 2, medium: 3, hard: 4, expert: 5,
};
const CATEGORY_ALIASES: Readonly<Record<string, PatQuestionType>> = {
  aperture: "aperture", keyhole: "aperture",
  "view-recognition": "view-recognition", tfe: "view-recognition",
  angle: "angle", angles: "angle",
  "paper-folding": "paper-folding", paper: "paper-folding",
  "cube-counting": "cube-counting", cubes: "cube-counting",
  "form-development": "form-development", form: "form-development",
};

interface ParsedArguments {
  readonly positionals: readonly string[];
  readonly flags: ReadonlyMap<string, readonly string[]>;
}

class CliError extends Error {
  public readonly exitCode: number;
  public constructor(message: string, exitCode: number) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

const parseArguments = (arguments_: readonly string[]): ParsedArguments => {
  const positionals: string[] = [];
  const flags = new Map<string, string[]>();
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index] ?? "";
    if (!argument.startsWith("--")) {
      positionals.push(argument);
      continue;
    }
    const [rawName, inlineValue] = argument.slice(2).split("=", 2);
    const name = rawName ?? "";
    const next = arguments_[index + 1];
    const value = inlineValue ?? (next !== undefined && !next.startsWith("--") ? next : "true");
    if (inlineValue === undefined && next !== undefined && !next.startsWith("--")) index += 1;
    flags.set(name, [...(flags.get(name) ?? []), value]);
  }
  return { positionals, flags };
};

const flag = (parsed: ParsedArguments, name: string): string | undefined => parsed.flags.get(name)?.at(-1);
const flagValues = (parsed: ParsedArguments, name: string): readonly string[] => parsed.flags.get(name) ?? [];
const hasFlag = (parsed: ParsedArguments, name: string): boolean => parsed.flags.has(name);

const category = (value: string): PatQuestionType => {
  const resolved = CATEGORY_ALIASES[value];
  if (resolved === undefined) throw new CliError(`Unknown category: ${value}`, EXIT.arguments);
  return resolved;
};

const solutionMode = (value: string): ExamSolutionMode => {
  if (value === "none" || value === "key" || value === "full") return value;
  throw new CliError(`Invalid solution mode: ${value}; expected none, key, or full`, EXIT.arguments);
};

const difficultyBand = (value: string): DifficultyBand => {
  const named = DIFFICULTY_NAMES[value.toLowerCase()];
  const numeric = Number(value);
  const resolved = named ?? numeric;
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > 5) {
    throw new CliError(`Invalid difficulty: ${value}`, EXIT.arguments);
  }
  return resolved as DifficultyBand;
};

const difficultyRequest = (value: string): DifficultyRequest => {
  if (!value.includes("-")) return difficultyBand(value);
  const [minimumText = "", maximumText = ""] = value.split("-", 2);
  const minimum = difficultyBand(minimumText);
  const maximum = difficultyBand(maximumText);
  if (maximum < minimum) throw new CliError("Difficulty range maximum is below minimum", EXIT.arguments);
  return [minimum, maximum];
};

const difficultyMix = (value: string): DifficultyMix => {
  const weights: Partial<Record<DifficultyBand, number>> = {};
  for (const item of value.split(",")) {
    const [bandText = "", weightText = ""] = item.split(":", 2);
    const band = difficultyBand(bandText);
    const weight = Number(weightText);
    if (!Number.isInteger(weight) || weight <= 0) throw new CliError(`Invalid difficulty weight: ${item}`, EXIT.arguments);
    weights[band] = weight;
  }
  return { kind: "mix", weights };
};

const parseCountAssignment = (value: string): readonly [PatQuestionType, number] => {
  const [name = "", countText = ""] = value.split("=", 2);
  const count = Number(countText);
  if (!Number.isInteger(count) || count <= 0) throw new CliError(`Invalid category count: ${value}`, EXIT.arguments);
  return [category(name), count];
};

const installOfflineGuard = (): void => {
  globalThis.fetch = () => Promise.reject(new Error("Network access is disabled by --offline"));
};

interface ConfigFile {
  readonly seed?: string;
  readonly output?: string;
  readonly difficulty?: number | string;
  readonly categories?: Readonly<Record<string, number | { readonly count: number; readonly difficulty?: number | string }>>;
  readonly formats?: readonly string[];
  readonly solutions?: ExamSolutionMode;
  /** Backward-compatible alias for solutions: full. */
  readonly includeExplanations?: boolean;
  readonly includeMeshes?: boolean;
  readonly offline?: boolean;
}

const readConfig = async (filename: string | undefined): Promise<ConfigFile> => {
  if (filename === undefined) return {};
  try {
    return JSON.parse(await readFile(filename, "utf8")) as ConfigFile;
  } catch (error) {
    throw new CliError(`Could not read config ${filename}: ${error instanceof Error ? error.message : "invalid JSON"}`, EXIT.config);
  }
};

const defaultProfile = async (filename: string): Promise<Readonly<Record<string, number>>> => {
  const profile = JSON.parse(await readFile(filename, "utf8")) as { categories?: Readonly<Record<string, number>> };
  if (profile.categories === undefined) throw new CliError("Profile has no categories", EXIT.config);
  return profile.categories;
};

const progress = (result: BatchResult, quiet: boolean, json: boolean): void => {
  if (quiet) return;
  if (json) {
    process.stdout.write(`${canonicalStringify(result.stats as unknown as JsonValue)}\n`);
    return;
  }
  process.stdout.write("DAT PAT Generator\n\n");
  for (const type of PAT_CATEGORIES) {
    const count = result.stats.acceptedByCategory[type];
    if (count !== undefined) process.stdout.write(`${type.padEnd(18)} ${count} accepted\n`);
  }
  process.stdout.write(`\n${result.stats.accepted} questions generated; ${Object.values(result.stats.rejected).reduce((a, b) => a + b, 0)} rejected\n`);
};

const generateCommand = async (parsed: ParsedArguments): Promise<void> => {
  const config = await readConfig(flag(parsed, "config"));
  const offline = hasFlag(parsed, "offline") || config.offline === true;
  if (offline) installOfflineGuard();
  const seed = flag(parsed, "seed") ?? process.env.DEBUG_PAT_SEED ?? config.seed ?? "manipat-default";
  const formats = (flag(parsed, "formats")?.split(",") ?? config.formats ?? ["html"]);
  if (formats.length !== 1 || formats[0] !== "html") {
    throw new CliError("Standalone generation supports only --formats html", EXIT.config);
  }
  const requestedSolutions = flag(parsed, "solutions")
    ?? config.solutions
    ?? ((hasFlag(parsed, "include-explanations") || config.includeExplanations === true) ? "full" : "none");
  const solutions = solutionMode(requestedSolutions);
  if (hasFlag(parsed, "include-meshes") || config.includeMeshes === true) {
    throw new CliError("Mesh persistence is not enabled; use the Three.js-compatible runtime render API", EXIT.config);
  }
  const mode = parsed.positionals[1]
    ?? (flag(parsed, "type") !== undefined ? "category" : config.categories === undefined ? "set" : "config");
  const profileFilename = flag(parsed, "profile") ?? path.resolve("profiles/default-full-set.json");
  const categories: Partial<Record<PatQuestionType, number>> = {};
  const categoryDifficulties: Partial<Record<PatQuestionType, DifficultyRequest>> = {};

  if (config.categories !== undefined) {
    for (const [name, value] of Object.entries(config.categories)) {
      const type = category(name);
      categories[type] = typeof value === "number" ? value : value.count;
      if (typeof value !== "number" && value.difficulty !== undefined) {
        categoryDifficulties[type] = difficultyRequest(String(value.difficulty));
      }
    }
  }
  if (mode === "set") {
    const profile = await defaultProfile(profileFilename);
    for (const [name, count] of Object.entries(profile)) categories[category(name)] = count;
  } else if (mode === "category") {
    const type = category(parsed.positionals[2] ?? flag(parsed, "type") ?? "");
    categories[type] = Number(flag(parsed, "count") ?? categories[type] ?? 15);
  } else if (mode === "categories") {
    for (const name of (flag(parsed, "categories") ?? "").split(",").filter(Boolean)) {
      categories[category(name)] = Number(flag(parsed, "count") ?? 15);
    }
  } else if (mode !== "config") {
    throw new CliError(`Unknown generate mode: ${mode}`, EXIT.arguments);
  }
  for (const assignment of flagValues(parsed, "category-count")) {
    const [type, count] = parseCountAssignment(assignment);
    categories[type] = count;
  }
  for (const assignment of flagValues(parsed, "category-difficulty")) {
    const [name = "", value = ""] = assignment.split("=", 2);
    categoryDifficulties[category(name)] = difficultyRequest(value);
  }
  if (Object.keys(categories).length === 0) {
    throw new CliError("At least one category is required", EXIT.arguments);
  }
  if (Object.values(categories).some((count) => !Number.isInteger(count) || (count ?? 0) <= 0)) {
    throw new CliError("Question counts must be positive integers", EXIT.arguments);
  }
  const rawDifficulty = flag(parsed, "difficulty") ?? String(config.difficulty ?? 3);
  const mixFlag = flag(parsed, "difficulty-mix");
  const difficulty = mixFlag === undefined ? difficultyRequest(rawDifficulty) : difficultyMix(mixFlag);
  const engine = await createPatEngine();
  const batchConfig: BatchConfig = {
    seed,
    categories,
    difficulty,
    ...(Object.keys(categoryDifficulties).length === 0 ? {} : { categoryDifficulty: categoryDifficulties }),
  };
  const workers = Number(flag(parsed, "workers") ?? 1);
  if (!Number.isInteger(workers) || workers < 1) {
    throw new CliError("--workers must be a positive integer", EXIT.arguments);
  }
  const result = workers === 1
    ? await generateBatch(engine, batchConfig)
    : await generateBatchWithWorkers(batchConfig, workers);
  const output = path.resolve(flag(parsed, "output") ?? config.output ?? path.join("output", `${seed}.html`));
  if (!output.toLowerCase().endsWith(".html")) {
    throw new CliError("Standalone generation output must be an .html file", EXIT.arguments);
  }
  try {
    await mkdir(path.dirname(output), { recursive: true });
    const examHtml = renderExamHtml(result.questions, {
      seed,
      profile: mode === "set" ? path.basename(profileFilename) : mode,
      difficulty: mixFlag ?? rawDifficulty,
      engineVersion: engine.engineVersion,
      cliVersion: CLI_VERSION,
      requestedCategoryCounts: categories,
      acceptedCategoryCounts: result.stats.acceptedByCategory,
      difficultyDistribution: result.stats.acceptedByDifficulty,
    });
    await writeFile(
      output,
      augmentExamHtmlWithSolutions(examHtml, result.questions, solutions),
      "utf8",
    );
  } catch (error) {
    throw new CliError(`Could not write output: ${error instanceof Error ? error.message : String(error)}`, EXIT.output);
  }
  progress(result, hasFlag(parsed, "quiet"), hasFlag(parsed, "json-progress"));
  if (!hasFlag(parsed, "quiet")) {
    process.stdout.write(`Output: ${output}\n`);
    process.stdout.write(`Solutions: ${solutions}\n`);
  }
};

const validateCommand = async (parsed: ParsedArguments): Promise<void> => {
  const target = parsed.positionals[1];
  if (target === undefined) throw new CliError("validate requires a path", EXIT.arguments);
  const questions = await readPersistedQuestions(path.resolve(target));
  const engine = await createPatEngine();
  const results = questions.map((question) => ({ id: question.id, ...engine.validate(question) }));
  const passed = results.every((result) => result.passed);
  process.stdout.write(`${canonicalStringify({ passed, questionCount: questions.length, results } as unknown as JsonValue)}\n`);
  if (!passed) throw new CliError("Validation failed", EXIT.validation);
};

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const safeFilenameSegment = (value: string): string => {
  const sanitized = value.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+/, "").slice(0, 160);
  return sanitized.length === 0 ? "question" : sanitized;
};

const inspectCommand = async (parsed: ParsedArguments): Promise<void> => {
  const target = parsed.positionals[1];
  if (target === undefined) throw new CliError("inspect requires a question file, directory, or ID", EXIT.arguments);
  let questions: readonly AnyPatQuestion[];
  try {
    await access(path.resolve(target));
    questions = await readPersistedQuestions(path.resolve(target));
  } catch {
    const input = flag(parsed, "input");
    if (input === undefined) throw new CliError("Inspecting an ID requires --input <directory>", EXIT.arguments);
    questions = await readPersistedQuestions(path.resolve(input));
  }
  const question = questions.find(({ id }) => id === target) ?? questions[0];
  if (question === undefined) throw new CliError("No matching question found", EXIT.arguments);
  const visuals = extractQuestionAssets(question).map(({ content, filename }) =>
    `<figure><img alt="${escapeHtml(filename)}" src="data:image/svg+xml;base64,${Buffer.from(content).toString("base64")}"><figcaption>${escapeHtml(filename)}</figcaption></figure>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(question.id)}</title><style>body{font-family:system-ui;max-width:1100px;margin:2rem auto}.assets{display:flex;flex-wrap:wrap;gap:1rem}figure{margin:0}img{width:220px;height:220px;object-fit:contain;border:1px solid #ddd}pre{white-space:pre-wrap;background:#f4f4f4;padding:1rem}</style></head><body><h1>${escapeHtml(question.id)}</h1><p>Answer: ${question.correctChoiceIndex + 1}; validation: ${question.validation.passed ? "PASS" : "FAIL"}</p><section class="assets">${visuals}</section><h2>Recipe, metadata, fingerprints, difficulty, and explanation</h2><pre>${escapeHtml(JSON.stringify(question, null, 2))}</pre></body></html>`;
  const output = path.resolve(flag(parsed, "output") ?? `${safeFilenameSegment(question.id)}.html`);
  await writeFile(output, html, "utf8");
  process.stdout.write(`${output}\n`);
};

const regenerateCommand = async (parsed: ParsedArguments): Promise<void> => {
  const seed = flag(parsed, "seed");
  const typeText = flag(parsed, "type");
  if (seed === undefined || typeText === undefined) throw new CliError("regenerate requires --seed and --type", EXIT.arguments);
  const engine = await createPatEngine();
  const candidates = await engine.generateCandidateGroup({
    type: category(typeText), seed,
    difficulty: difficultyBand(flag(parsed, "difficulty") ?? "3"),
  }, 3);
  const expectedQuestionId = flag(parsed, "question-id");
  const expectedTemplate = flag(parsed, "template");
  const question = candidates.find((candidate) =>
    (expectedQuestionId === undefined || candidate.id === expectedQuestionId)
    && (expectedTemplate === undefined || candidate.templateId === expectedTemplate));
  if (question === undefined) {
    throw new CliError("Seed produced no question matching --question-id/--template", EXIT.config);
  }
  const serialized = `${serializeQuestion(question)}\n`;
  const output = flag(parsed, "output");
  if (output === undefined) process.stdout.write(serialized);
  else await writeFile(path.resolve(output), serialized, "utf8");
};

const benchmarkCommand = async (): Promise<void> => {
  const engine = await createPatEngine();
  const results: Record<string, number> = {};
  for (const type of PAT_CATEGORIES) {
    const count = type === "view-recognition" ? 10 : 100;
    const start = performance.now();
    for (let index = 0; index < count; index += 1) {
      await engine.generate({ type, seed: `benchmark:${type}:${index}`, difficulty: 3 });
    }
    results[type] = (performance.now() - start) / count;
  }
  process.stdout.write(`${canonicalStringify({ averageMilliseconds: results } as unknown as JsonValue)}\n`);
};

const doctorCommand = async (): Promise<void> => {
  const checks: Record<string, boolean> = {};
  checks.node = Number(process.versions.node.split(".")[0]) >= 22;
  const kernel = await createManifoldKernel();
  using cube = kernel.cube([1, 1, 1]);
  checks.manifold = kernel.validate(cube).valid;
  using voxel = createVoxelInstancedRender([[0, 0, 0]]);
  checks.three = voxel.mesh.count === 1;
  checks.determinism = createRandomSource("doctor").next() === createRandomSource("doctor").next();
  const engine = await createPatEngine();
  const angle = await engine.generate({ type: "angle", seed: "doctor", difficulty: 1 });
  checks.svg = angle.type === "angle" && angle.prompt.svg.startsWith("<svg");
  const directory = await mkdtemp(path.join(tmpdir(), "manipat-doctor-"));
  await writeFile(path.join(directory, "write-test"), "ok", "utf8");
  checks.write = true;
  installOfflineGuard();
  checks.offline = await fetch("https://example.invalid").then(
    () => false,
    (error: unknown) => error instanceof Error && error.message.includes("disabled by --offline"),
  );
  const passed = Object.values(checks).every(Boolean);
  process.stdout.write(`${canonicalStringify({ checks, passed } as unknown as JsonValue)}\n`);
  if (!checks.determinism) throw new CliError("Determinism check failed", EXIT.determinism);
  if (!passed) throw new CliError("Doctor checks failed", EXIT.runtime);
};

const listCommand = (parsed: ParsedArguments): void => {
  const kind = parsed.positionals[1];
  if (kind === "categories") process.stdout.write(`${PAT_CATEGORIES.join("\n")}\n`);
  else if (kind === "difficulties") process.stdout.write("1 beginner\n2 easy\n3 medium\n4 hard\n5 expert\n");
  else if (kind === "profiles") process.stdout.write("default-full-set\n");
  else throw new CliError("list requires categories, difficulties, or profiles", EXIT.arguments);
};

const main = async (): Promise<void> => {
  const parsed = parseArguments(process.argv.slice(2));
  switch (parsed.positionals[0]) {
    case "generate": await generateCommand(parsed); break;
    case "validate": await validateCommand(parsed); break;
    case "inspect": await inspectCommand(parsed); break;
    case "regenerate": await regenerateCommand(parsed); break;
    case "benchmark": await benchmarkCommand(); break;
    case "doctor": await doctorCommand(); break;
    case "list": listCommand(parsed); break;
    default: throw new CliError("Usage: dat-pat <generate|validate|inspect|regenerate|benchmark|doctor|list>", EXIT.arguments);
  }
};

main().catch((error: unknown) => {
  const exitCode = error instanceof CliError
    ? error.exitCode
    : error instanceof GenerationTargetError ? EXIT.target
      : error instanceof ConfigurationError ? EXIT.config : EXIT.runtime;
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = exitCode;
});
