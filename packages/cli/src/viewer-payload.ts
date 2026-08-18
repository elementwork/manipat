import type { Vec2 } from "@manipat/core";
import type { RuntimeVisualizationPayload } from "@manipat/renderer-three";

export interface PaperGuideStepPayload {
  readonly kind: "punch" | "unfold";
  readonly title: string;
  readonly completedFoldCount: number;
  readonly baseSvg: string | null;
  readonly holes: readonly Vec2[];
  readonly newHoles: readonly Vec2[];
  readonly departedHoles: readonly Vec2[];
  readonly affectedLayerCount: number;
  readonly foldLine?: {
    readonly point: Vec2;
    readonly unitDirection: Vec2;
  };
}

export interface PaperFoldAnimationPayload {
  readonly foldId: string;
  readonly line: {
    readonly point: Vec2;
    readonly unitDirection: Vec2;
  };
  readonly stationaryPolygons: readonly (readonly Vec2[])[];
  readonly movingPolygons: readonly (readonly Vec2[])[];
}

export interface PaperGuidePayload {
  readonly kind: "paper-guide";
  readonly questionId: string;
  readonly category: "paper-folding";
  readonly title: string;
  /** One self-contained original overview of forward folds and reverse unfolding. */
  readonly overviewSvg: string;
  readonly questionSvgs: readonly string[];
  readonly correctSvg: string;
  readonly punches: readonly {
    readonly point: Vec2;
    readonly layerCount: number;
  }[];
  readonly steps: readonly PaperGuideStepPayload[];
  readonly foldAnimations: readonly PaperFoldAnimationPayload[];
}

export type ViewerPayload = RuntimeVisualizationPayload | PaperGuidePayload;
