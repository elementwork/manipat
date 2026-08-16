import type { TfeQuestion } from "./types.js";

export const solveTfeQuestion = (question: TfeQuestion): readonly number[] =>
  question.choices.flatMap((choice, index) =>
    choice.view.fingerprint === question.prompt.targetFingerprint ? [index] : [],
  );
