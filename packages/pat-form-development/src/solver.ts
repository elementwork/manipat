import type { FormDevelopmentQuestion } from "./types.js";

export const solveFormDevelopmentQuestion = (
  question: FormDevelopmentQuestion,
): readonly number[] => question.choices.flatMap((choice, index) =>
  choice.fingerprint === question.prompt.targetFingerprint ? [index] : []);
