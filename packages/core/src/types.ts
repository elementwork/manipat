export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];

export interface Segment2 {
  readonly a: Vec2;
  readonly b: Vec2;
}

export interface Segment3 {
  readonly a: Vec3;
  readonly b: Vec3;
}

export type FeatureKind =
  | "base"
  | "union"
  | "subtract"
  | "intersect"
  | "hull"
  | "extrude"
  | "revolve"
  | "transform";

export interface FeatureProvenance {
  readonly id: string;
  readonly kind: FeatureKind;
  readonly semanticType?: string;
  readonly parentIds: readonly string[];
  readonly params: Readonly<Record<string, unknown>>;
}

export interface GeometryOperation {
  readonly id: string;
  readonly kind: FeatureKind;
  readonly semanticType?: string;
  readonly parentIds: readonly string[];
  readonly params: Readonly<Record<string, unknown>>;
}

export interface SolidRecipe {
  readonly id: string;
  readonly version: number;
  readonly seed: string;
  readonly templateId: string;
  readonly operations: readonly GeometryOperation[];
}

export type PatQuestionType =
  | "aperture"
  | "view-recognition"
  | "angle"
  | "paper-folding"
  | "cube-counting"
  | "form-development";

export interface ValidationCheck {
  readonly id: string;
  readonly passed: boolean;
  readonly severity: "error" | "warning";
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface PatQuestion<
  TPrompt,
  TAnswer,
  TExplanation,
  TType extends PatQuestionType = PatQuestionType,
> {
  readonly id: string;
  readonly engineVersion: string;
  readonly type: TType;
  readonly seed: string;
  readonly templateId: string;
  readonly templateVersion: number;
  readonly prompt: TPrompt;
  readonly choices: readonly TAnswer[];
  readonly correctChoiceIndex: number;
  readonly explanation: TExplanation;
  readonly difficulty: {
    readonly raw: number;
    readonly normalized: number;
    readonly band: 1 | 2 | 3 | 4 | 5;
    readonly components: Readonly<Record<string, number>>;
  };
  readonly validation: {
    readonly passed: boolean;
    readonly checks: readonly ValidationCheck[];
  };
  readonly fingerprints: Readonly<Record<string, string>>;
  readonly metadata: Readonly<Record<string, unknown>>;
}
