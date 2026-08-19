import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const cli = path.resolve("packages/cli/dist/index.js");

const generateAngle = async (output: string, extra: readonly string[] = []): Promise<string> => {
  await execFileAsync(process.execPath, [
    cli,
    "generate",
    "category",
    "angle",
    "--count",
    "1",
    "--seed",
    "solutions-cli",
    "--difficulty",
    "1",
    "--offline",
    "--quiet",
    "--output",
    output,
    ...extra,
  ]);
  return readFile(output, "utf8");
};

describe("solution output CLI", () => {
  it("supports none, key, full, and the legacy include-explanations alias", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "manipat-solutions-cli-"));

    const defaultHtml = await generateAngle(path.join(directory, "default.html"));
    expect(defaultHtml).not.toContain("Answer Key");
    expect(defaultHtml).not.toContain("Solutions &amp; Explanations");

    const keyHtml = await generateAngle(path.join(directory, "key.html"), ["--solutions", "key"]);
    expect(keyHtml).toContain("Answer Key");
    expect(keyHtml).not.toContain("Solutions &amp; Explanations");

    const fullHtml = await generateAngle(path.join(directory, "full.html"), ["--solutions", "full"]);
    expect(fullHtml).toContain("Answer Key");
    expect(fullHtml).toContain("Solutions &amp; Explanations");
    expect(fullHtml).toContain("Measured angles");

    const legacyHtml = await generateAngle(path.join(directory, "legacy.html"), ["--include-explanations"]);
    expect(legacyHtml).toContain("Solutions &amp; Explanations");
  }, 30_000);
});
