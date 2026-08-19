#!/usr/bin/env node
import { portableViewerCommand } from "./portable-viewer.js";

interface ParsedPortableArguments {
  readonly target: string | undefined;
  readonly output: string | undefined;
  readonly questionId: string | undefined;
  readonly category: string | undefined;
}

const parse = (args: readonly string[]): ParsedPortableArguments => {
  let target: string | undefined;
  let output: string | undefined;
  let questionId: string | undefined;
  let category: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (!arg.startsWith("--")) {
      target ??= arg;
      continue;
    }
    const [rawName = "", inlineValue] = arg.slice(2).split("=", 2);
    const next = args[index + 1];
    const value = inlineValue ?? (next !== undefined && !next.startsWith("--") ? next : undefined);
    if (inlineValue === undefined && value === next) index += 1;
    switch (rawName) {
      case "output": output = value; break;
      case "question-id": questionId = value; break;
      case "category": category = value; break;
      default: throw new RangeError(`Unknown portable viewer option: --${rawName}`);
    }
  }
  return { target, output, questionId, category };
};

const main = async (): Promise<void> => {
  const parsed = parse(process.argv.slice(2));
  if (parsed.target === undefined) {
    throw new RangeError(
      "Usage: dat-pat-portable-viewer <generated-question-file> [--output <interactive.html>] [--category <interactive-category>] [--question-id <id>]",
    );
  }
  await portableViewerCommand({
    target: parsed.target,
    ...(parsed.output === undefined ? {} : { output: parsed.output }),
    ...(parsed.questionId === undefined ? {} : { questionId: parsed.questionId }),
    ...(parsed.category === undefined ? {} : { category: parsed.category }),
  });
};

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
