import type { PaperFoldingQuestion } from "./types.js";

export const solvePaperFoldingQuestion = (
  question: PaperFoldingQuestion,
): readonly number[] => question.choices.flatMap((choice, index) =>
  choice.fingerprint === question.fingerprints.pattern ? [index] : []);
