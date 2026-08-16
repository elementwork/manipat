import type { PatQuestion, SolidRecipe, ValidationCheck } from "@manipat/core";
import type { OrthographicView } from "@manipat/geometry";

export type TfeViewName = "front" | "top" | "end";

export interface TfeDiagram {
  readonly name: TfeViewName;
  readonly view: OrthographicView;
  readonly svg: string;
}

export type TfeDistractorMutation =
  | "move-line"
  | "shorten-line"
  | "visibility-flip"
  | "mirror-view";

export interface TfeChoice extends TfeDiagram {
  readonly mutation?: TfeDistractorMutation;
}

export interface TfePrompt {
  readonly recipe: SolidRecipe;
  readonly givenViews: readonly TfeDiagram[];
  readonly missingView: TfeViewName;
  readonly targetFingerprint: string;
}

export interface TfeExplanation {
  readonly type: "view-recognition";
  readonly missingView: TfeViewName;
  readonly correctChoice: number;
  readonly facts: readonly {
    readonly axis: "width" | "depth" | "height";
    readonly correspondence: string;
  }[];
  readonly wrongChoices: Readonly<Record<string, TfeDistractorMutation>>;
}

export type TfeQuestion = PatQuestion<TfePrompt, TfeChoice, TfeExplanation, "view-recognition">;

export interface TfeValidationResult {
  readonly passed: boolean;
  readonly checks: readonly ValidationCheck[];
  readonly matchingChoiceIndices: readonly number[];
}
