import type { PatQuestion, ValidationCheck, Vec2 } from "@manipat/core";

export interface AngleItem {
  readonly id: number;
  readonly vertex: Vec2;
  readonly rayA: Vec2;
  readonly rayB: Vec2;
  readonly angleDegrees: number;
  readonly rotationDegrees: number;
  readonly rayLengths: readonly [number, number];
}

export interface AnglePrompt {
  readonly items: readonly AngleItem[];
  readonly svg: string;
}

export interface AngleChoice {
  readonly order: readonly number[];
}

export interface AngleExplanation {
  readonly type: "angle";
  readonly measuredDegrees: Readonly<Record<string, number>>;
  readonly orderSmallestToLargest: readonly number[];
}

export type AngleQuestion = PatQuestion<AnglePrompt, AngleChoice, AngleExplanation, "angle">;

export interface AngleValidationResult {
  readonly passed: boolean;
  readonly checks: readonly ValidationCheck[];
  readonly matchingChoiceIndices: readonly number[];
}
