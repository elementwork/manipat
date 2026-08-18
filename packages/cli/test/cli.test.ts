import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const cli = path.resolve("packages/cli/dist/index.js");

describe("offline CLI", () => {
  it("lists categories and passes doctor", async () => {
    const listed = await execFileAsync(process.execPath, [cli, "list", "categories"]);
    expect(listed.stdout).toContain("form-development");
    const doctor = await execFileAsync(process.execPath, [cli, "doctor"]);
    expect(JSON.parse(doctor.stdout)).toMatchObject({ passed: true });
  });

  it("generates and validates a six-category offline set deterministically", async () => {
    const first = path.join(await mkdtemp(path.join(tmpdir(), "manipat-cli-first-")), "exam.html");
    const second = path.join(await mkdtemp(path.join(tmpdir(), "manipat-cli-second-")), "exam.html");
    const argumentsFor = (output: string) => [
      cli, "generate", "categories", "--categories", "aperture,tfe,angle,paper,cubes,form",
      "--count", "1", "--seed", "cli-offline", "--difficulty", "2-4",
      "--offline", "--workers", "2", "--quiet", "--output", output,
    ];
    await execFileAsync(process.execPath, argumentsFor(first));
    await execFileAsync(process.execPath, argumentsFor(second));
    const firstHtml = await readFile(first, "utf8");
    const secondHtml = await readFile(second, "utf8");
    expect(firstHtml).toBe(secondHtml);
    expect(firstHtml).toContain("manipat-exam-data");
    expect(firstHtml).not.toMatch(/<link|<script[^>]+src=/i);
    const validation = await execFileAsync(process.execPath, [cli, "validate", first]);
    expect(JSON.parse(validation.stdout)).toMatchObject({ passed: true, questionCount: 6 });
  }, 60_000);

  it("sanitizes imported question IDs used by inspect HTML and default filenames", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "manipat-cli-inspect-"));
    const regenerated = await execFileAsync(process.execPath, [
      cli, "regenerate", "--seed", "inspect-hardening", "--type", "angle", "--difficulty", "2",
    ]);
    const question = JSON.parse(regenerated.stdout) as { id: string } & Record<string, unknown>;
    question.id = '../evil" onerror="alert(1)';
    const input = path.join(directory, "question.jsonl");
    await writeFile(input, `${JSON.stringify(question)}\n`, "utf8");

    const inspected = await execFileAsync(process.execPath, [cli, "inspect", input], { cwd: directory });
    const output = inspected.stdout.trim();
    expect(path.dirname(output)).toBe(directory);
    expect(path.basename(output)).toBe('evil_onerror_alert_1_.html');
    const html = await readFile(output, "utf8");
    expect(html).toContain('&quot; onerror=&quot;alert(1)');
    expect(html).not.toContain('alt="../evil" onerror="alert(1)');
  });
});
