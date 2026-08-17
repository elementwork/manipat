import type { ValidationCheck, Vec3 } from "@manipat/core";
import { verifyNet } from "./nets.js";
import { solveFormDevelopmentQuestion } from "./solver.js";
import type {
  FormDevelopmentQuestion,
  FormDevelopmentValidationResult,
} from "./types.js";

const check = (id: string, passed: boolean): ValidationCheck => ({ id, passed, severity: "error" });

const distance = (a: Vec3, b: Vec3): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const geometrySeparation = (
  source: readonly Vec3[],
  candidate: readonly Vec3[],
): number => {
  if (source.length !== candidate.length || source.length === 0) return Number.POSITIVE_INFINITY;
  const xs = source.map(([x]) => x);
  const ys = source.map(([, y]) => y);
  const zs = source.map(([, , z]) => z);
  const span = Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
    Math.max(...zs) - Math.min(...zs),
    1e-9,
  );
  return Math.max(...source.map((vertex, index) =>
    distance(vertex, candidate[index] ?? vertex) / span));
};

export const validateFormDevelopmentQuestion = (
  question: FormDevelopmentQuestion,
): FormDevelopmentValidationResult => {
  const net = verifyNet(question.prompt.polyhedron, question.prompt.net);
  const matches = solveFormDevelopmentQuestion(question);
  const sourceVertices = question.prompt.polyhedron.vertices;
  const separations = question.choices.map(({ vertices }) => geometrySeparation(sourceVertices, vertices));
  const checks = [
    check("valid-net", net.valid),
    check("four-choices", question.choices.length === 4),
    check("choice-geometry", question.choices.every(({ vertices }) => vertices.length === sourceVertices.length)),
    check("unique-choices", new Set(question.choices.map(({ fingerprint }) => fingerprint)).size === 4),
    check("unique-rendered-choices", new Set(question.choices.map(({ svg }) => svg)).size === question.choices.length),
    check("meaningful-geometric-separation", question.choices.every((_, index) =>
      index === question.correctChoiceIndex || (separations[index] ?? 0) >= 0.055)),
    check("exactly-one-answer", matches.length === 1),
    check("correct-index", matches[0] === question.correctChoiceIndex),
    check("renderable", question.prompt.svg.startsWith("<svg") && question.choices.every(({ svg }) => svg.startsWith("<svg"))),
  ];
  return { passed: checks.every(({ passed }) => passed), checks, matchingChoiceIndices: matches };
};
