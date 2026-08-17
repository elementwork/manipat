import type { PatQuestion, ValidationCheck, Vec2, Vec3 } from "@manipat/core";

export interface FacePattern {
  readonly kind: "dot" | "stripe" | "triangle";
  readonly rotationQuarterTurns: 0 | 1 | 2 | 3;
}

export interface PolyFace {
  readonly id: string;
  readonly vertexIds: readonly number[];
  readonly label?: string;
  readonly pattern?: FacePattern;
}

export interface LogicalPolyhedron {
  readonly id:
    | "cube"
    | "triangular-prism"
    | "square-pyramid"
    | "trapezoidal-prism"
    | "house-prism";
  readonly vertices: readonly Vec3[];
  readonly faces: readonly PolyFace[];
}

export interface FaceAdjacency {
  readonly faceA: string;
  readonly faceB: string;
  readonly sharedVertexIds: readonly [number, number];
}

export interface NetFace {
  readonly faceId: string;
  readonly polygon: readonly Vec2[];
  readonly pattern?: FacePattern;
}

export interface NetConnection {
  readonly faceA: string;
  readonly faceB: string;
}

export interface PolyhedronNet {
  readonly polyhedronId: LogicalPolyhedron["id"];
  readonly faces: readonly NetFace[];
  readonly connections: readonly NetConnection[];
}

export interface FormDevelopmentPrompt {
  readonly polyhedron: LogicalPolyhedron;
  readonly net: PolyhedronNet;
  readonly svg: string;
  readonly targetFingerprint: string;
}

export interface FormDevelopmentChoice {
  readonly polyhedronId: LogicalPolyhedron["id"];
  /** Present on v2 dimensional-geometry choices; v1 marking questions omit it. */
  readonly vertices?: readonly Vec3[];
  /** Presentation-only rotation around the vertical axis; solver truth ignores it. */
  readonly viewQuarterTurns?: 0 | 1 | 2 | 3;
  readonly patterns: Readonly<Record<string, FacePattern>>;
  readonly chirality: "original" | "mirrored";
  readonly fingerprint: string;
  readonly svg: string;
  readonly mutation?: string;
}

export interface FormDevelopmentExplanation {
  readonly type: "form-development";
  readonly adjacency: readonly FaceAdjacency[];
  readonly markedFaces: readonly string[];
  readonly chirality: "original";
}

export type FormDevelopmentQuestion = PatQuestion<
  FormDevelopmentPrompt,
  FormDevelopmentChoice,
  FormDevelopmentExplanation,
  "form-development"
>;

export interface FormDevelopmentValidationResult {
  readonly passed: boolean;
  readonly checks: readonly ValidationCheck[];
  readonly matchingChoiceIndices: readonly number[];
}
