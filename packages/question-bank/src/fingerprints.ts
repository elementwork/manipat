import { fingerprint64 } from "@manipat/core";
import type { AnyPatQuestion } from "./types.js";

export const questionContentFingerprint = (question: AnyPatQuestion): string => {
  const semanticKey = (() => {
    switch (question.type) {
      case "aperture": return `${question.templateId}:${question.fingerprints.silhouette ?? question.id}`;
      case "view-recognition": return `${question.templateId}:${question.fingerprints.view ?? question.id}`;
      case "angle": return question.fingerprints.items ?? question.id;
      case "paper-folding": return question.fingerprints.question ?? question.id;
      case "cube-counting": return `${question.fingerprints.figure ?? question.id}:${question.prompt.targetPaintedFaces}`;
      case "form-development": return `${question.fingerprints.net ?? question.id}:${question.fingerprints.target ?? ""}`;
      default: return question satisfies never;
    }
  })();
  return fingerprint64(`${question.type}:${semanticKey}`);
};

export class QuestionDuplicateDetector {
  readonly #fingerprints = new Set<string>();

  public constructor(existing: readonly AnyPatQuestion[] = []) {
    existing.forEach((question) => this.#fingerprints.add(questionContentFingerprint(question)));
  }

  public accept(question: AnyPatQuestion): boolean {
    const fingerprint = questionContentFingerprint(question);
    if (this.#fingerprints.has(fingerprint)) return false;
    this.#fingerprints.add(fingerprint);
    return true;
  }

  public get size(): number {
    return this.#fingerprints.size;
  }
}
