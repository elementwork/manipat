import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalStringify, fingerprint64, type JsonValue } from "@manipat/core";
import { extractQuestionAssets } from "./assets.js";
import { extractExamQuestions } from "./exam-html.js";
import { parseQuestionsJsonl, serializeQuestionsJsonl } from "./serialization.js";
import type { BatchResult } from "./batch.js";
import type { AnyPatQuestion } from "./types.js";

export interface PersistOptions {
  readonly outputDirectory: string;
  readonly seed: string;
  readonly profile: string;
  readonly difficulty: string;
  readonly engineVersion: string;
  readonly cliVersion: string;
  readonly requestedCategoryCounts?: Readonly<Record<string, number>>;
}

const writeCanonicalJson = async (filename: string, value: JsonValue): Promise<void> => {
  await writeFile(filename, `${canonicalStringify(value)}\n`, "utf8");
};

export const persistBatch = async (
  result: BatchResult,
  options: PersistOptions,
): Promise<void> => {
  const assetsDirectory = path.join(options.outputDirectory, "assets");
  const promptDirectory = path.join(assetsDirectory, "prompts");
  const choiceDirectory = path.join(assetsDirectory, "choices");
  const explanationDirectory = path.join(assetsDirectory, "explanations");
  const meshesDirectory = path.join(assetsDirectory, "meshes");
  await Promise.all([
    mkdir(promptDirectory, { recursive: true }),
    mkdir(choiceDirectory, { recursive: true }),
    mkdir(explanationDirectory, { recursive: true }),
    mkdir(meshesDirectory, { recursive: true }),
    ...Object.keys(result.stats.acceptedByCategory).map((category) =>
      mkdir(path.join(options.outputDirectory, "categories", category), { recursive: true })),
  ]);
  const jsonl = serializeQuestionsJsonl(result.questions);
  await writeFile(path.join(options.outputDirectory, "questions.jsonl"), jsonl, "utf8");
  for (const category of Object.keys(result.stats.acceptedByCategory)) {
    const categoryQuestions = result.questions.filter(({ type }) => type === category);
    await writeFile(
      path.join(options.outputDirectory, "categories", category, "questions.jsonl"),
      serializeQuestionsJsonl(categoryQuestions),
      "utf8",
    );
  }
  const assets = result.questions.flatMap(extractQuestionAssets);
  const seenAssets = new Set<string>();
  for (const item of assets) {
    if (seenAssets.has(item.filename)) continue;
    seenAssets.add(item.filename);
    const directory = item.kind === "prompt-svg"
      ? promptDirectory
      : item.kind === "choice-svg" ? choiceDirectory : explanationDirectory;
    await writeFile(path.join(directory, item.filename), item.content, "utf8");
  }
  const validationReport = {
    passed: result.questions.every(({ validation }) => validation.passed),
    questionCount: result.questions.length,
    failures: result.questions.flatMap((question) => question.validation.passed ? [] : [question.id]),
  };
  await writeCanonicalJson(
    path.join(options.outputDirectory, "validation-report.json"),
    validationReport,
  );
  await writeCanonicalJson(
    path.join(options.outputDirectory, "generation-stats.json"),
    result.stats as unknown as JsonValue,
  );
  // Keep the manifest reproducible. Run-time timestamps belong in external job
  // logs, not in the canonical generated artifact described by the seed/version
  // contract.
  await writeCanonicalJson(path.join(options.outputDirectory, "manifest.json"), {
    acceptedCategoryCounts: result.stats.acceptedByCategory,
    cliVersion: options.cliVersion,
    contentHashes: {
      assets: fingerprint64(assets.map(({ contentHash }) => contentHash).sort().join(":")),
      questions: fingerprint64(jsonl),
    },
    difficulty: options.difficulty,
    difficultyDistribution: result.stats.acceptedByDifficulty,
    engineVersion: options.engineVersion,
    profile: options.profile,
    requestedCategoryCounts: options.requestedCategoryCounts ?? result.stats.acceptedByCategory,
    seed: options.seed,
  } as JsonValue);
};

export const readPersistedQuestions = async (pathOrFile: string): Promise<readonly AnyPatQuestion[]> => {
  const filename = (await stat(pathOrFile)).isDirectory()
    ? path.join(pathOrFile, "questions.jsonl")
    : pathOrFile;
  const content = await readFile(filename, "utf8");
  return filename.endsWith(".html") ? extractExamQuestions(content) : parseQuestionsJsonl(content);
};
