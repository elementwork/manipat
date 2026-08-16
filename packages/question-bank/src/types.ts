import type { PatQuestionType } from "@manipat/core";
import type { AngleQuestion } from "@manipat/pat-angle";
import type { ApertureQuestion } from "@manipat/pat-aperture";
import type { CubeCountingQuestion } from "@manipat/pat-cube-counting";
import type { FormDevelopmentQuestion } from "@manipat/pat-form-development";
import type { PaperFoldingQuestion } from "@manipat/pat-paper-folding";
import type { TfeQuestion } from "@manipat/pat-view-recognition";

export type DifficultyBand = 1 | 2 | 3 | 4 | 5;
export type AnyPatQuestion =
  | AngleQuestion
  | ApertureQuestion
  | CubeCountingQuestion
  | FormDevelopmentQuestion
  | PaperFoldingQuestion
  | TfeQuestion;

export const PAT_CATEGORIES: readonly PatQuestionType[] = [
  "aperture",
  "view-recognition",
  "angle",
  "paper-folding",
  "cube-counting",
  "form-development",
];

export interface GenerateRequest {
  readonly type: PatQuestionType;
  readonly seed: string;
  readonly difficulty?: DifficultyBand;
}

export interface UnifiedValidationResult {
  readonly passed: boolean;
  readonly type: PatQuestionType;
  readonly failures: readonly string[];
}

export interface QuestionAsset {
  readonly questionId: string;
  readonly kind: "prompt-svg" | "choice-svg" | "explanation-svg";
  readonly contentHash: string;
  readonly format: "svg";
  readonly filename: string;
  readonly content: string;
}
