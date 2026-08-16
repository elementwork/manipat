import type {
  FeatureProvenance,
  PatQuestionType,
  RandomSource,
  SolidRecipe,
} from "@manipat/core";
import type { GeometryKernel, SolidHandle } from "@manipat/geometry";

export interface TemplateContext {
  readonly kernel: GeometryKernel;
  readonly seed: string;
  readonly random: RandomSource;
}

export interface GeneratedSolid {
  readonly solid: SolidHandle;
  readonly recipe: SolidRecipe;
  readonly provenance: readonly FeatureProvenance[];
}

export interface ObjectTemplate {
  readonly id: string;
  readonly version: number;
  readonly allowedQuestionTypes: readonly PatQuestionType[];
  instantiate(context: TemplateContext): GeneratedSolid;
}
