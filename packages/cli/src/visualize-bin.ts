#!/usr/bin/env node
import { visualizeCommand } from "./visualize.js";

interface ParsedViewerArguments {
  readonly target: string | undefined;
  readonly questionId: string | undefined;
  readonly category: string | undefined;
  readonly host: string | undefined;
  readonly port: string | undefined;
  readonly dryRun: boolean;
}

const parse = (args: readonly string[]): ParsedViewerArguments => {
  let target: string | undefined;
  let questionId: string | undefined;
  let category: string | undefined;
  let host: string | undefined;
  let port: string | undefined;
  let dryRun = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (!arg.startsWith("--")) {
      target ??= arg;
      continue;
    }
    const [rawName = "", inlineValue] = arg.slice(2).split("=", 2);
    if (rawName === "dry-run") {
      dryRun = true;
      continue;
    }
    const next = args[index + 1];
    const value = inlineValue ?? (next !== undefined && !next.startsWith("--") ? next : undefined);
    if (inlineValue === undefined && value === next) index += 1;
    switch (rawName) {
      case "question-id": questionId = value; break;
      case "category": category = value; break;
      case "host": host = value; break;
      case "port": port = value; break;
      default: throw new RangeError(`Unknown viewer option: --${rawName}`);
    }
  }
  return { target, questionId, category, host, port, dryRun };
};

const main = async (): Promise<void> => {
  const parsed = parse(process.argv.slice(2));
  if (parsed.target === undefined) {
    throw new RangeError(
      "Usage: dat-pat-viewer <generated-question-file> [--category <3d-category>] [--question-id <id>] [--host 127.0.0.1] [--port 4173] [--dry-run]",
    );
  }
  await visualizeCommand({
    target: parsed.target,
    ...(parsed.questionId === undefined ? {} : { questionId: parsed.questionId }),
    ...(parsed.category === undefined ? {} : { category: parsed.category }),
    ...(parsed.host === undefined ? {} : { host: parsed.host }),
    ...(parsed.port === undefined ? {} : { port: parsed.port }),
    ...(parsed.dryRun ? { dryRun: true } : {}),
  });
};

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
