import type { PatQuestion, ValidationCheck, Vec2 } from "@manipat/core";

export interface FoldLine {
  readonly point: Vec2;
  readonly unitDirection: Vec2;
}

export interface FoldInstruction {
  readonly id: string;
  readonly line: FoldLine;
  readonly movingSide: -1 | 1;
}

export interface FoldTransform {
  readonly foldId: string;
  readonly reflected: boolean;
}

export interface PaperLayer {
  readonly id: string;
  readonly polygon: readonly Vec2[];
  readonly currentCenter: Vec2;
  readonly sourceCenter: Vec2;
  readonly transformHistory: readonly FoldTransform[];
  readonly depthOrder: number;
  readonly sourceLayerId: string;
}

export interface Punch {
  readonly id: string;
  readonly point: Vec2;
  readonly sourceLayerIds: readonly string[];
}

export interface FoldState {
  readonly layers: readonly PaperLayer[];
  readonly punches: readonly Punch[];
  readonly folds: readonly FoldInstruction[];
}

export interface PaperFoldingPrompt {
  readonly folds: readonly FoldInstruction[];
  readonly punches: readonly Vec2[];
  readonly stepSvgs: readonly string[];
}

export interface PaperFoldingChoice {
  readonly holes: readonly Vec2[];
  readonly fingerprint: string;
  readonly svg: string;
  readonly mutation?: string;
}

export interface PaperFoldingExplanation {
  readonly type: "paper-folding";
  readonly unfoldOrder: readonly string[];
  readonly punchLayers: Readonly<Record<string, readonly string[]>>;
  readonly finalHoles: readonly Vec2[];
}

export type PaperFoldingQuestion = PatQuestion<
  PaperFoldingPrompt,
  PaperFoldingChoice,
  PaperFoldingExplanation,
  "paper-folding"
>;

export interface PaperFoldingValidationResult {
  readonly passed: boolean;
  readonly checks: readonly ValidationCheck[];
  readonly matchingChoiceIndices: readonly number[];
}
