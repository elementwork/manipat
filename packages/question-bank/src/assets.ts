import { fingerprint64 } from "@manipat/core";
import type { AnyPatQuestion, QuestionAsset } from "./types.js";

const asset = (
  questionId: string,
  kind: QuestionAsset["kind"],
  filename: string,
  content: string,
): QuestionAsset => ({
  questionId,
  kind,
  contentHash: fingerprint64(content),
  format: "svg",
  filename,
  content,
});

export const extractQuestionAssets = (question: AnyPatQuestion): readonly QuestionAsset[] => {
  switch (question.type) {
    case "aperture":
      return [
        asset(question.id, "prompt-svg", `${question.id}-object.svg`, question.prompt.pictorialSvg),
        ...question.choices.map(({ svg }, index) =>
          asset(question.id, "choice-svg", `${question.id}-choice-${index}.svg`, svg)),
      ];
    case "view-recognition":
      return [
        ...question.prompt.givenViews.map(({ svg, name }) =>
          asset(question.id, "prompt-svg", `${question.id}-${name}.svg`, svg)),
        ...question.choices.map(({ svg }, index) =>
          asset(question.id, "choice-svg", `${question.id}-choice-${index}.svg`, svg)),
      ];
    case "angle":
      return [asset(question.id, "prompt-svg", `${question.id}-prompt.svg`, question.prompt.svg)];
    case "paper-folding":
      return [
        ...question.prompt.stepSvgs.map((svg, index) =>
          asset(question.id, "prompt-svg", `${question.id}-step-${index}.svg`, svg)),
        ...question.choices.map(({ svg }, index) =>
          asset(question.id, "choice-svg", `${question.id}-choice-${index}.svg`, svg)),
      ];
    case "cube-counting":
      return [asset(question.id, "prompt-svg", `${question.prompt.figure.id}.svg`, question.prompt.figure.svg)];
    case "form-development":
      return [
        asset(question.id, "prompt-svg", `${question.id}-net.svg`, question.prompt.svg),
        ...question.choices.map(({ svg }, index) =>
          asset(question.id, "choice-svg", `${question.id}-choice-${index}.svg`, svg)),
      ];
    default:
      return question satisfies never;
  }
};
