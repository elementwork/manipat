import type {
  PatQuestion,
  SolidRecipe,
  ValidationCheck,
  Vec3,
} from "@manipat/core";
import type { CanonicalSection2D } from "@manipat/geometry";

export type ApertureDistractorType =
  | "too-narrow"
  | "too-wide"
  | "missing-feature"
  | "extra-feature"
  | "wrong-concavity"
  | "wrong-position"
  | "wrong-projection";

export interface ApertureDistractorReason {
  readonly type: ApertureDistractorType;
  readonly featureId?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface ApertureChoice {
  readonly id: string;
  readonly silhouette: CanonicalSection2D;
  readonly fingerprint: string;
  readonly svg: string;
  readonly distractorReason?: ApertureDistractorReason;
}

export interface AperturePrompt {
  readonly recipe: SolidRecipe;
  readonly orientationDegrees: Vec3;
  readonly pictorialSvg: string;
  readonly targetSilhouetteFingerprint: string;
  readonly mesh: {
    readonly vertexCount: number;
    readonly triangleCount: number;
  };
}

export interface ApertureExplanation {
  readonly type: "aperture";
  readonly correctChoice: number;
  readonly facts: readonly {
    readonly featureId: string;
    readonly effect: string;
  }[];
  readonly wrongChoices: Readonly<Record<string, ApertureDistractorReason>>;
}

export type ApertureQuestion = PatQuestion<
  AperturePrompt,
  ApertureChoice,
  ApertureExplanation,
  "aperture"
>;

export interface ApertureValidationResult {
  readonly passed: boolean;
  readonly checks: readonly ValidationCheck[];
  readonly matchingChoiceIndices: readonly number[];
}
