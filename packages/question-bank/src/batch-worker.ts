import { parentPort, workerData } from "node:worker_threads";
import { createPatEngine } from "./engine.js";
import { generateBatch, type BatchConfig } from "./batch.js";

const run = async (): Promise<void> => {
  if (parentPort === null) throw new Error("Batch worker requires a parent port");
  const engine = await createPatEngine();
  const result = await generateBatch(engine, workerData as BatchConfig);
  parentPort.postMessage(result);
};

await run();
