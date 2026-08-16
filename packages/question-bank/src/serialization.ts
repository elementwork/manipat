import { canonicalStringify, type JsonValue } from "@manipat/core";
import type { AnyPatQuestion } from "./types.js";

export const serializeQuestion = (question: AnyPatQuestion): string =>
  canonicalStringify(question as unknown as JsonValue);

export const serializeQuestionsJsonl = (questions: readonly AnyPatQuestion[]): string =>
  `${questions.map(serializeQuestion).join("\n")}\n`;

export const parseQuestionsJsonl = (contents: string): readonly AnyPatQuestion[] =>
  contents.split(/\r?\n/u).filter((line) => line.trim().length > 0).map((line) =>
    JSON.parse(line) as AnyPatQuestion);
