import type { PatQuestion, ValidationCheck } from "@manipat/core";
import type { CubeCoordinate } from "./voxel-grid.js";

export interface CubeCountingFigure {
  readonly id: string;
  readonly cubes: readonly CubeCoordinate[];
  readonly svg: string;
  readonly fingerprint: string;
  readonly paintingConvention: "exposed-except-resting-bottom";
}

export interface CubeCountingPrompt {
  readonly figure: CubeCountingFigure;
  readonly targetPaintedFaces: 1 | 2 | 3 | 4 | 5;
}

export interface CubeCountingExplanation {
  readonly type: "cube-counting";
  readonly targetPaintedFaces: number;
  readonly matchingCubes: readonly CubeCoordinate[];
  readonly count: number;
}

export type CubeCountingQuestion = PatQuestion<
  CubeCountingPrompt,
  number,
  CubeCountingExplanation,
  "cube-counting"
>;

export interface CubeCountingValidationResult {
  readonly passed: boolean;
  readonly checks: readonly ValidationCheck[];
  readonly matchingChoiceIndices: readonly number[];
}
