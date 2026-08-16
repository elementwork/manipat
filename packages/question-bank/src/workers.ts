import { Worker } from "node:worker_threads";
import type { PatQuestionType } from "@manipat/core";
import type { BatchConfig, BatchResult, GenerationStats } from "./batch.js";

const addCounts = (
  target: Record<string, number>,
  source: Readonly<Record<string, number>>,
): void => {
  for (const [key, value] of Object.entries(source)) target[key] = (target[key] ?? 0) + value;
};

const mergeResults = (results: readonly BatchResult[]): BatchResult => {
  const rejected: Record<string, number> = {};
  const acceptedByCategory: Record<string, number> = {};
  const acceptedByDifficulty: Record<string, number> = {};
  const rejectedByCategory: Record<string, number> = {};
  const rejectedByDifficulty: Record<string, number> = {};
  let generated = 0;
  let accepted = 0;
  for (const { stats } of results) {
    generated += stats.generated;
    accepted += stats.accepted;
    addCounts(rejected, stats.rejected);
    addCounts(acceptedByCategory, stats.acceptedByCategory);
    addCounts(acceptedByDifficulty, stats.acceptedByDifficulty);
    addCounts(rejectedByCategory, stats.rejectedByCategory);
    addCounts(rejectedByDifficulty, stats.rejectedByDifficulty);
  }
  const stats: GenerationStats = {
    generated,
    accepted,
    rejected,
    acceptedByCategory,
    acceptedByDifficulty,
    rejectedByCategory,
    rejectedByDifficulty,
  };
  return {
    questions: results.flatMap(({ questions }) => questions),
    traces: results.flatMap(({ traces }) => traces),
    stats,
  };
};

const runWorker = (config: BatchConfig): Promise<BatchResult> => new Promise((resolve, reject) => {
  const worker = new Worker(new URL("./batch-worker.js", import.meta.url), { workerData: config });
  worker.once("message", (result: BatchResult) => resolve(result));
  worker.once("error", reject);
  worker.once("exit", (code) => {
    if (code !== 0) reject(new Error(`Batch worker exited with code ${code}`));
  });
});

/**
 * Generates independent category batches in worker threads. Each worker creates
 * its own Manifold WASM context; result ordering remains the configuration order.
 */
export const generateBatchWithWorkers = async (
  config: BatchConfig,
  maximumWorkers: number,
): Promise<BatchResult> => {
  if (!Number.isInteger(maximumWorkers) || maximumWorkers < 1) {
    throw new RangeError("maximumWorkers must be a positive integer");
  }
  const entries = Object.entries(config.categories) as Array<[PatQuestionType, number]>;
  const results: BatchResult[] = new Array(entries.length);
  let nextIndex = 0;
  const runner = async (): Promise<void> => {
    while (nextIndex < entries.length) {
      const index = nextIndex;
      nextIndex += 1;
      const [type, count] = entries[index] as [PatQuestionType, number];
      const { categoryDifficulty, ...sharedConfig } = config;
      const requestedDifficulty = categoryDifficulty?.[type];
      results[index] = await runWorker({
        ...sharedConfig,
        categories: { [type]: count },
        ...(requestedDifficulty === undefined
          ? {}
          : { categoryDifficulty: { [type]: requestedDifficulty } }),
      });
    }
  };
  await Promise.all(Array.from({ length: Math.min(maximumWorkers, entries.length) }, runner));
  return mergeResults(results);
};
