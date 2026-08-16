import type { ValidationCheck } from "@manipat/core";
import { verifyNet } from "./nets.js";
import { solveFormDevelopmentQuestion } from "./solver.js";
import type {
  FormDevelopmentQuestion,
  FormDevelopmentValidationResult,
} from "./types.js";

const check = (id: string, passed: boolean): ValidationCheck => ({ id, passed, severity: "error" });

export const validateFormDevelopmentQuestion = (
  question: FormDevelopmentQuestion,
): FormDevelopmentValidationResult => {
  const net = verifyNet(question.prompt.polyhedron, question.prompt.net);
  const matches = solveFormDevelopmentQuestion(question);
  const checks = [
    check("valid-net", net.valid),
    check("four-choices", question.choices.length === 4),
    check("unique-choices", new Set(question.choices.map(({ fingerprint }) => fingerprint)).size === 4),
    check("exactly-one-answer", matches.length === 1),
    check("correct-index", matches[0] === question.correctChoiceIndex),
    check("renderable", question.prompt.svg.startsWith("<svg") && question.choices.every(({ svg }) => svg.startsWith("<svg"))),
  ];
  return { passed: checks.every(({ passed }) => passed), checks, matchingChoiceIndices: matches };
};
